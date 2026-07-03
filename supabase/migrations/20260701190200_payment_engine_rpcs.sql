-- ╔═══ محرّك السداد: القسم 6 من الدستور + تعزيزات أمنية/محاسبية ═══╗
--
-- اصطلاح المدين/الدائن المعتمد في كل الدوال التالية:
--   حاويات الأصول (cash_drawer, accumulated_cash, bank, checks_on_hand):
--     مدين يزيد الرصيد، دائن ينقصه.
--   حاوية الالتزام (suppliers_payable):
--     دائن يزيد الرصيد (دَين أكبر)، مدين ينقصه (سداد الدَين).
-- بهذا الاصطلاح، كل حركة تُسجَّل بمجموع مدين = مجموع دائن دائمًا (قانون
-- حفظ الطاقة، القسم 4)، بما في ذلك السداد للموردين والشيكات الراجعة.

-- ── pay_supplier: سداد متعدد المصادر (نقد + شيكات)، FIFO على الفواتير ──
create or replace function pay_supplier(
  p_supplier  uuid,
  p_cash      numeric,
  p_check_ids uuid[],
  p_actor     uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_checks_total numeric(14,2) := 0;
  v_total        numeric(14,2);
  v_txn          uuid;
  v_remaining    numeric(14,2);
  v_inv          record;
  v_apply        numeric(14,2);
  v_cash_acc     uuid;
  v_checks_acc   uuid;
  v_payable_acc  uuid;
begin
  if not exists (
    select 1 from profiles where id = p_actor and role in ('admin', 'super_admin')
  ) then
    raise exception 'ليس لديك صلاحية لتنفيذ هذه العملية' using errcode = '42501';
  end if;

  select coalesce(sum(amount), 0) into v_checks_total
  from checks where id = any(p_check_ids) and status = 'available';

  v_total := coalesce(p_cash, 0) + v_checks_total;
  if v_total <= 0 then raise exception 'لا يوجد مبلغ للسداد'; end if;

  insert into transactions(type, total, user_id, note, supplier_id)
  values ('payment', v_total, p_actor, 'سداد متعدد المصادر', p_supplier)
  returning id into v_txn;

  select id into v_cash_acc    from accounts where code = 'accumulated_cash';
  select id into v_checks_acc  from accounts where code = 'checks_on_hand';
  select id into v_payable_acc from accounts where code = 'suppliers_payable';

  if coalesce(p_cash, 0) > 0 then
    insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_cash_acc, p_cash);
    update accounts set balance = balance - p_cash where id = v_cash_acc;
  end if;

  if v_checks_total > 0 then
    insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_checks_acc, v_checks_total);
    update accounts set balance = balance - v_checks_total where id = v_checks_acc;
    update checks set status = 'endorsed', endorsed_to = p_supplier
    where id = any(p_check_ids) and status = 'available';
  end if;

  insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_payable_acc, v_total);
  update accounts set balance = balance - v_total where id = v_payable_acc;

  update suppliers set balance = balance - v_total where id = p_supplier;

  v_remaining := v_total;
  for v_inv in
    select id, (amount - paid) as due from invoices
    where supplier_id = p_supplier and is_deleted = false and (amount - paid) > 0
    order by coalesce(due_date, created_at::date), created_at
  loop
    exit when v_remaining <= 0;
    v_apply := least(v_remaining, v_inv.due);
    update invoices set paid = paid + v_apply where id = v_inv.id;
    insert into payment_allocations(transaction_id, invoice_id, amount) values (v_txn, v_inv.id, v_apply);
    v_remaining := v_remaining - v_apply;
  end loop;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor, 'pay_supplier', 'supplier', p_supplier,
          jsonb_build_object('cash', p_cash, 'checks', v_checks_total, 'txn', v_txn));

  return v_txn;
end; $$;

-- ── skim_drawer: إفراغ الدرج إلى النقد المتراكم (admin/super_admin/cashier) ──
create or replace function skim_drawer(
  p_amount numeric,
  p_actor  uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_txn        uuid;
  v_drawer_acc uuid;
  v_drawer_bal numeric(14,2);
  v_accum_acc  uuid;
begin
  if not exists (
    select 1 from profiles where id = p_actor and role in ('admin', 'super_admin', 'cashier')
  ) then
    raise exception 'ليس لديك صلاحية لتنفيذ هذه العملية' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'المبلغ غير صالح';
  end if;

  select id, balance into v_drawer_acc, v_drawer_bal from accounts where code = 'cash_drawer';
  if p_amount > v_drawer_bal then
    raise exception 'المبلغ (%) يتجاوز رصيد الدرج الحالي (%)', p_amount, v_drawer_bal;
  end if;

  select id into v_accum_acc from accounts where code = 'accumulated_cash';

  insert into transactions(type, total, user_id, note)
  values ('liquidity_transfer', p_amount, p_actor, 'إفراغ الدرج')
  returning id into v_txn;

  insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_drawer_acc, p_amount);
  update accounts set balance = balance - p_amount where id = v_drawer_acc;

  insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_accum_acc, p_amount);
  update accounts set balance = balance + p_amount where id = v_accum_acc;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor, 'skim_drawer', 'account', v_drawer_acc, jsonb_build_object('amount', p_amount, 'txn', v_txn));

  return v_txn;
end; $$;

-- ── bounce_check: الشيك الراجع + العلامة الحمراء (admin/super_admin) ──
create or replace function bounce_check(
  p_check_id uuid,
  p_actor    uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_check       checks%rowtype;
  v_txn         uuid;
  v_checks_acc  uuid;
  v_payable_acc uuid;
begin
  if not exists (
    select 1 from profiles where id = p_actor and role in ('admin', 'super_admin')
  ) then
    raise exception 'ليس لديك صلاحية لتنفيذ هذه العملية' using errcode = '42501';
  end if;

  select * into v_check from checks where id = p_check_id for update;
  if not found then
    raise exception 'الشيك غير موجود';
  end if;
  if v_check.status <> 'endorsed' then
    raise exception 'لا يمكن ترجيع شيك بحالة %', v_check.status;
  end if;

  update checks set status = 'bounced' where id = p_check_id;

  select id into v_checks_acc  from accounts where code = 'checks_on_hand';
  select id into v_payable_acc from accounts where code = 'suppliers_payable';

  insert into transactions(type, total, user_id, note, supplier_id)
  values ('reversal', v_check.amount, p_actor, 'شيك راجع', v_check.endorsed_to)
  returning id into v_txn;

  insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_checks_acc, v_check.amount);
  update accounts set balance = balance + v_check.amount where id = v_checks_acc;

  insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_payable_acc, v_check.amount);
  update accounts set balance = balance + v_check.amount where id = v_payable_acc;

  update suppliers
  set balance = balance + v_check.amount,
      red_flag = true,
      red_flag_note = coalesce(red_flag_note || E'\n', '')
        || 'شيك راجع بمبلغ ' || v_check.amount::text || ' بتاريخ ' || now()::date
  where id = v_check.endorsed_to;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor, 'bounce_check', 'check', p_check_id, jsonb_build_object('amount', v_check.amount, 'txn', v_txn));

  return v_txn;
end; $$;

-- ── reverse_transaction: آلة عكس الزمن العامة (admin/super_admin) ──
create or replace function reverse_transaction(
  p_transaction_id uuid,
  p_actor          uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_orig            transactions%rowtype;
  v_new_txn         uuid;
  v_entry           record;
  v_delta           numeric(14,2);
  v_supplier_delta  numeric(14,2) := 0;
  v_alloc           record;
begin
  if not exists (
    select 1 from profiles where id = p_actor and role in ('admin', 'super_admin')
  ) then
    raise exception 'ليس لديك صلاحية لتنفيذ هذه العملية' using errcode = '42501';
  end if;

  select * into v_orig from transactions where id = p_transaction_id for update;
  if not found then
    raise exception 'الحركة غير موجودة';
  end if;
  if v_orig.reversed_by is not null then
    raise exception 'تم عكس هذه الحركة مسبقًا';
  end if;

  insert into transactions(type, total, user_id, note, supplier_id)
  values ('reversal', v_orig.total, p_actor, 'تراجع عن الحركة ' || p_transaction_id::text, v_orig.supplier_id)
  returning id into v_new_txn;

  -- عكس كل سطور القيد المزدوج: نبادل المدين/الدائن، ونطبّق الأثر العكسي
  -- على رصيد كل حاوية بحسب طبيعتها (أصل أو التزام).
  for v_entry in
    select le.account_id, le.debit, le.credit, a.code
    from ledger_entries le join accounts a on a.id = le.account_id
    where le.transaction_id = p_transaction_id
  loop
    insert into ledger_entries(transaction_id, account_id, debit, credit)
    values (v_new_txn, v_entry.account_id, v_entry.credit, v_entry.debit);

    if v_entry.code = 'suppliers_payable' then
      v_delta := v_entry.debit - v_entry.credit;
      v_supplier_delta := v_delta;
    else
      v_delta := v_entry.credit - v_entry.debit;
    end if;

    update accounts set balance = balance + v_delta where id = v_entry.account_id;
  end loop;

  -- عكس تخصيصات FIFO على الفواتير بدقة (إن وُجدت لهذه الحركة)
  for v_alloc in
    select invoice_id, amount from payment_allocations where transaction_id = p_transaction_id
  loop
    update invoices set paid = paid - v_alloc.amount where id = v_alloc.invoice_id;
  end loop;

  -- إعادة ضبط رصيد المورد الإجمالي بنفس اتجاه ومقدار أثر حاوية ذمم الموردين
  if v_orig.supplier_id is not null and v_supplier_delta <> 0 then
    update suppliers set balance = balance + v_supplier_delta where id = v_orig.supplier_id;
  end if;

  update transactions set reversed_by = v_new_txn where id = p_transaction_id;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor, 'reverse_transaction', 'transaction', p_transaction_id,
          jsonb_build_object('new_txn', v_new_txn));

  return v_new_txn;
end; $$;
