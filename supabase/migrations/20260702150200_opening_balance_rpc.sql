-- حساب حقوق الرصيد الافتتاحي (الطرف المقابل لكل ضبط رصيد افتتاحي).
insert into accounts (code, name_ar, balance) values
  ('opening_equity', 'حقوق افتتاحية', 0)
on conflict (code) do nothing;

-- ── set_opening_balance: ضبط رصيد حاوية مال إلى قيمة مستهدفة بقيد متوازن ──
-- للمدير العام فقط. المنفِّذ من auth.uid() مباشرةً (النمط الآمن للدوال الجديدة،
-- بلا معامل actor قابل للتزوير). الفرق (المستهدف − الحالي) يُرحَّل مقابل حساب
-- الحقوق الافتتاحية فيبقى sum(debit)=sum(credit). أداة إعداد/تصحيح دائمة.
create or replace function set_opening_balance(p_code text, p_amount numeric)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_actor        uuid := auth.uid();
  v_acc          uuid;
  v_cur          numeric(14,2);
  v_delta        numeric(14,2);
  v_eq           uuid;
  v_debit_normal boolean;
  v_txn          uuid;
begin
  if v_actor is null or not exists (
    select 1 from profiles where id = v_actor and role = 'super_admin'
  ) then
    raise exception 'هذه العملية للمدير العام فقط' using errcode = '42501';
  end if;

  if p_code not in ('cash_drawer','accumulated_cash','bank','checks_on_hand',
                    'customer_receivable','suppliers_payable') then
    raise exception 'حساب غير قابل للضبط الافتتاحي: %', p_code;
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'المبلغ غير صالح';
  end if;

  select id, balance into v_acc, v_cur from accounts where code = p_code::account_type for update;
  v_delta := p_amount - v_cur;
  if v_delta = 0 then return null; end if;

  select id into v_eq from accounts where code = 'opening_equity';
  -- أصول: طبيعتها مدينة (الرصيد يرتفع بالمدين). ذمم الموردين التزام (دائن).
  v_debit_normal := p_code in ('cash_drawer','accumulated_cash','bank','checks_on_hand','customer_receivable');

  insert into transactions(type, total, user_id, note)
  values ('opening_balance', abs(v_delta), v_actor, 'ضبط رصيد افتتاحي: ' || p_code)
  returning id into v_txn;

  -- سطر الحاوية: مدين إن (أصل يرتفع) أو (التزام ينخفض)، وإلا دائن.
  if (v_debit_normal and v_delta > 0) or (not v_debit_normal and v_delta < 0) then
    insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_acc, abs(v_delta));
    -- الطرف المقابل (الحقوق): دائن.
    insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_eq, abs(v_delta));
    update accounts set balance = balance + abs(v_delta) where id = v_eq;
  else
    insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_acc, abs(v_delta));
    insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_eq, abs(v_delta));
    update accounts set balance = balance - abs(v_delta) where id = v_eq;
  end if;

  update accounts set balance = balance + v_delta where id = v_acc;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (v_actor, 'set_opening_balance', 'account', v_acc,
          jsonb_build_object('code', p_code, 'target', p_amount, 'delta', v_delta, 'txn', v_txn));

  return v_txn;
end; $$;

revoke execute on function set_opening_balance(text, numeric) from public;
grant execute on function set_opening_balance(text, numeric) to authenticated;
