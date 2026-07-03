-- محرّك التحفيز: دالة داخلية مشتركة تمنح غبار النجوم وتُعيد حساب الكواكب
-- المفتوحة. ليست معرَّضة عبر API مباشرة (EXECUTE محجوب عن anon/authenticated)
-- — تُستدعى فقط من داخل دوال RPC الأخرى security definer (سياقها postgres).
create or replace function award_stardust(p_profile_id uuid, p_amount int)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_new_total int;
  v_planets   text[];
begin
  if p_amount <= 0 then return; end if;

  update profiles set stardust = stardust + p_amount
  where id = p_profile_id
  returning stardust into v_new_total;

  select array_agg(planet order by threshold) into v_planets
  from (values
    ('mercury', 100), ('venus', 300), ('earth', 600), ('mars', 1000), ('jupiter', 1500)
  ) as p(planet, threshold)
  where threshold <= v_new_total;

  update profiles set unlocked_planets = coalesce(v_planets, '{}') where id = p_profile_id;
end; $$;

revoke execute on function award_stardust(uuid, int) from public, anon, authenticated;

-- ── close_daily_orbit: طقس إغلاق المدار اليومي ──
create or replace function close_daily_orbit(
  p_counted numeric,
  p_actor   uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_close_id   uuid;
  v_drawer_acc uuid;
  v_accum_acc  uuid;
  v_expected   numeric(14,2);
  v_variance   numeric(14,2);
  v_txn        uuid;
  v_stardust   int := 0;
begin
  if not exists (
    select 1 from profiles where id = p_actor and role in ('admin', 'super_admin', 'cashier')
  ) then
    raise exception 'ليس لديك صلاحية لتنفيذ هذه العملية' using errcode = '42501';
  end if;

  if p_counted is null or p_counted < 0 then
    raise exception 'المبلغ المعدود غير صالح';
  end if;

  if exists (select 1 from daily_closes where close_date = current_date) then
    raise exception 'تم إغلاق اليوم مسبقًا';
  end if;

  select id, balance into v_drawer_acc, v_expected from accounts where code = 'cash_drawer' for update;
  select id into v_accum_acc from accounts where code = 'accumulated_cash';

  v_variance := p_counted - v_expected;

  -- الفرق يمثّل مبيعات اليوم الفعلية إن كان موجبًا (تُسحب للنقد المتراكم)،
  -- أو عجزًا يُغطّى من النقد المتراكم إن كان سالبًا — بأي الحالتين حركة
  -- مالية متوازنة حقيقية (sales_skim)، وليست مجرّد لقطة سلبية.
  if v_variance <> 0 then
    insert into transactions(type, total, user_id, note)
    values ('sales_skim', abs(v_variance), p_actor, 'تسوية إغلاق اليوم')
    returning id into v_txn;

    if v_variance > 0 then
      insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_drawer_acc, v_variance);
      insert into ledger_entries(transaction_id, account_id, debit)  values (v_txn, v_accum_acc, v_variance);
      update accounts set balance = balance - v_variance where id = v_drawer_acc;
      update accounts set balance = balance + v_variance where id = v_accum_acc;
    else
      insert into ledger_entries(transaction_id, account_id, debit)  values (v_txn, v_drawer_acc, -v_variance);
      insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_accum_acc, -v_variance);
      update accounts set balance = balance + (-v_variance) where id = v_drawer_acc;
      update accounts set balance = balance - (-v_variance) where id = v_accum_acc;
    end if;
  end if;

  if v_variance = 0 then
    v_stardust := v_stardust + 15;
  elsif abs(v_variance) <= 5.00 then
    v_stardust := v_stardust + 5;
  end if;

  if not exists (select 1 from suppliers where red_flag) then
    v_stardust := v_stardust + 20;
  end if;

  insert into daily_closes(close_date, expected_drawer, counted_drawer, transaction_id, stardust_awarded, closed_by)
  values (current_date, v_expected, p_counted, v_txn, v_stardust, p_actor)
  returning id into v_close_id;

  if v_stardust > 0 then
    perform award_stardust(p_actor, v_stardust);
  end if;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor, 'close_daily_orbit', 'daily_close', v_close_id,
          jsonb_build_object('expected', v_expected, 'counted', p_counted, 'variance', v_variance, 'stardust', v_stardust));

  return v_close_id;
end; $$;

-- ── pay_supplier: إضافة مكافأة تحفيزية للسداد المبكر لأقدم فاتورة مستحقة ──
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
  v_first_inv      boolean := true;
  v_stardust       int := 0;
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
    select id, due_date, (amount - paid) as due from invoices
    where supplier_id = p_supplier and is_deleted = false and (amount - paid) > 0
    order by coalesce(due_date, created_at::date), created_at
  loop
    exit when v_remaining <= 0;
    v_apply := least(v_remaining, v_inv.due);
    update invoices set paid = paid + v_apply where id = v_inv.id;
    insert into payment_allocations(transaction_id, invoice_id, amount) values (v_txn, v_inv.id, v_apply);

    if v_first_inv then
      if v_apply = v_inv.due and (v_inv.due_date is null or v_inv.due_date >= current_date) then
        v_stardust := 10;
      end if;
      v_first_inv := false;
    end if;

    v_remaining := v_remaining - v_apply;
  end loop;

  if v_stardust > 0 then
    perform award_stardust(p_actor, v_stardust);
  end if;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor, 'pay_supplier', 'supplier', p_supplier,
          jsonb_build_object('cash', p_cash, 'checks', v_checks_total, 'txn', v_txn, 'stardust', v_stardust));

  return v_txn;
end; $$;
