-- تقوية محرّك السداد بعد مراجعة: أقفال صفوف لمنع سباقات التزامن، وتحقّقات
-- إضافية من الحالات الحدّية. لا تغيير في السلوك الطبيعي (غير المتزامن).

-- ── pay_supplier: قفل الشيكات المطلوبة + رفض النقد السالب + رفض المورد
-- غير الموجود برسالة واضحة + رفض الشيكات غير المتاحة صراحة بدل تجاهلها ──
create or replace function pay_supplier(
  p_supplier  uuid,
  p_cash      numeric,
  p_check_ids uuid[],
  p_actor     uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_checks_total   numeric(14,2) := 0;
  v_checks_locked  int := 0;
  v_requested      int := coalesce(array_length(p_check_ids, 1), 0);
  v_total          numeric(14,2);
  v_txn            uuid;
  v_remaining      numeric(14,2);
  v_inv            record;
  v_apply          numeric(14,2);
  v_cash_acc       uuid;
  v_checks_acc     uuid;
  v_payable_acc    uuid;
begin
  if not exists (
    select 1 from profiles where id = p_actor and role in ('admin', 'super_admin')
  ) then
    raise exception 'ليس لديك صلاحية لتنفيذ هذه العملية' using errcode = '42501';
  end if;

  if not exists (select 1 from suppliers where id = p_supplier) then
    raise exception 'المورد غير موجود';
  end if;

  if p_cash is not null and p_cash < 0 then
    raise exception 'المبلغ النقدي غير صالح';
  end if;

  -- قفل الشيكات المطلوبة قبل حساب المجموع يمنع سباق التزامن: عمليتا سداد
  -- متزامنتان لن تتمكّنا معًا من قراءة نفس الشيك كـ "متاح" في آنٍ واحد.
  -- (FOR UPDATE لا يمكن دمجها مباشرة مع دوال تجميع؛ لذا القفل في CTE منفصل.)
  if v_requested > 0 then
    with locked_checks as (
      select amount from checks
      where id = any(p_check_ids) and status = 'available'
      for update
    )
    select coalesce(sum(amount), 0), count(*)
      into v_checks_total, v_checks_locked
    from locked_checks;

    if v_checks_locked <> v_requested then
      raise exception 'بعض الشيكات المختارة لم تعد متاحة';
    end if;
  end if;

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

-- ── skim_drawer: قفل صف الدرج قبل التحقق من الرصيد ──
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

  select id, balance into v_drawer_acc, v_drawer_bal
  from accounts where code = 'cash_drawer'
  for update;

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

-- ── bounce_check: حارس دفاعي إضافي على endorsed_to ──
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
  if v_check.endorsed_to is null then
    raise exception 'الشيك غير مرتبط بمورد';
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
