-- ═══ محرّك القروض البنكية + تتبّع الدفعات المقسّطة ═══
--
-- قانون حفظ الطاقة: استلام قرض = مدين البنك (يزيد الأصل)، دائن loans_payable
-- (يزيد الالتزام). سداد قسط = مدين loans_payable (ينقص الالتزام)، دائن المصدر
-- (بنك/متراكم). كل قسط حركة منفصلة مربوطة بالقرض (loan_id) فتُبنى "متابعة
-- الدفعات" (كم دُفع من أصل الدين لكل جهة) من سجل الحركات مباشرة.

insert into accounts (code, name_ar, balance) values ('loans_payable', 'قروض بنكية', 0)
on conflict (code) do nothing;

alter table transactions add column loan_id uuid;

-- جدول القروض: الجهة + أصل الدين. الدفعات transactions من نوع loan_payment مربوطة به.
create table bank_loans (
  id uuid primary key default gen_random_uuid(),
  party_name text not null,
  principal numeric(14,2) not null check (principal > 0),
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table bank_loans enable row level security;
create policy "read_bank_loans" on bank_loans for select using (auth.role() = 'authenticated');
-- لا سياسات كتابة مباشرة: كل الكتابة عبر دوال RPC (security definer) لضمان القيد المتوازن.

-- ── استلام قرض بنكي ──
create or replace function record_bank_loan(p_party text, p_amount numeric, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_loan     uuid;
  v_txn      uuid;
  v_bank_acc uuid;
  v_loan_acc uuid;
begin
  if not has_capability(auth.uid(), 'manage_finance') then
    raise exception 'لا صلاحية لتسجيل القروض' using errcode = '42501';
  end if;
  if coalesce(btrim(p_party), '') = '' then
    raise exception 'جهة القرض مطلوبة';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'مبلغ القرض غير صالح';
  end if;

  insert into bank_loans (party_name, principal, note, created_by)
  values (p_party, p_amount, p_note, auth.uid())
  returning id into v_loan;

  select id into v_bank_acc from accounts where code = 'bank';
  select id into v_loan_acc from accounts where code = 'loans_payable';

  insert into transactions(type, total, user_id, note, loan_id)
  values ('loan_received', p_amount, auth.uid(), coalesce(p_note, 'قرض بنكي من ' || p_party), v_loan)
  returning id into v_txn;

  insert into ledger_entries(transaction_id, account_id, debit)  values (v_txn, v_bank_acc, p_amount);
  update accounts set balance = balance + p_amount where id = v_bank_acc;

  insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_loan_acc, p_amount);
  update accounts set balance = balance + p_amount where id = v_loan_acc;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (auth.uid(), 'record_bank_loan', 'bank_loan', v_loan,
          jsonb_build_object('party', p_party, 'amount', p_amount, 'txn', v_txn));

  return v_loan;
end; $$;

-- ── سداد قسط قرض ──
create or replace function record_loan_payment(
  p_loan_id uuid,
  p_amount  numeric,
  p_source  text,
  p_note    text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_txn        uuid;
  v_loan_acc   uuid;
  v_src_acc    uuid;
  v_src_bal    numeric(14,2);
  v_principal  numeric(14,2);
  v_paid       numeric(14,2);
begin
  if not has_capability(auth.uid(), 'manage_finance') then
    raise exception 'لا صلاحية لتسجيل دفعات القروض' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'مبلغ الدفعة غير صالح';
  end if;
  if p_source not in ('bank', 'accumulated_cash') then
    raise exception 'مصدر السداد غير صالح';
  end if;

  select principal into v_principal from bank_loans where id = p_loan_id;
  if not found then
    raise exception 'القرض غير موجود';
  end if;

  select coalesce(sum(total), 0) into v_paid
  from transactions where loan_id = p_loan_id and type = 'loan_payment';

  if p_amount > (v_principal - v_paid) then
    raise exception 'الدفعة (%) تتجاوز المتبقّي من القرض (%)', p_amount, (v_principal - v_paid);
  end if;

  select id, balance into v_src_acc, v_src_bal
  from accounts where code = p_source::account_type for update;
  if p_amount > v_src_bal then
    raise exception 'الدفعة (%) تتجاوز رصيد المصدر (%)', p_amount, v_src_bal;
  end if;

  select id into v_loan_acc from accounts where code = 'loans_payable';

  insert into transactions(type, total, user_id, note, loan_id)
  values ('loan_payment', p_amount, auth.uid(), p_note, p_loan_id)
  returning id into v_txn;

  insert into ledger_entries(transaction_id, account_id, debit)  values (v_txn, v_loan_acc, p_amount);
  update accounts set balance = balance - p_amount where id = v_loan_acc;

  insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_src_acc, p_amount);
  update accounts set balance = balance - p_amount where id = v_src_acc;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (auth.uid(), 'record_loan_payment', 'bank_loan', p_loan_id,
          jsonb_build_object('amount', p_amount, 'source', p_source, 'txn', v_txn));

  return v_txn;
end; $$;

-- ── منح/سحب التنفيذ (فخّ السحاب: سحب صريح من anon) ──
revoke execute on function record_bank_loan(text, numeric, text)             from public, anon;
grant  execute on function record_bank_loan(text, numeric, text)             to authenticated;
revoke execute on function record_loan_payment(uuid, numeric, text, text)    from public, anon;
grant  execute on function record_loan_payment(uuid, numeric, text, text)    to authenticated;
