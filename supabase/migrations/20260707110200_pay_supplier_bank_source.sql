-- توسيع pay_supplier بمصدر رابع: البنك (شيك/تحويل بنكي لمورد من حساب البنك).
-- p_bank = دائن حساب البنك، يُضاف لإجمالي السداد المدفوع من suppliers_payable.
-- بنفس فلسفة بقية المصادر: قيد بمعاملة واحدة، توزيع FIFO، صلاحية admin.
--
-- pay_supplier مُغلَّفة (impl + wrapper يفرض auth.uid). إضافة معامل تستلزم إسقاط
-- النسختين القديمتين (5 معاملات) وإنشاء نسختين بالتوقيع الجديد (6 معاملات).

drop function if exists pay_supplier(uuid, numeric, numeric, uuid[], uuid);
drop function if exists pay_supplier_impl(uuid, numeric, numeric, uuid[], uuid);

create function pay_supplier_impl(
  p_supplier  uuid,
  p_cash      numeric,
  p_drawer    numeric,
  p_bank      numeric,
  p_check_ids uuid[],
  p_actor     uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_checks_total   numeric(14,2) := 0;
  v_checks_locked  int := 0;
  v_requested      int := coalesce(array_length(p_check_ids, 1), 0);
  v_drawer         numeric(14,2) := coalesce(p_drawer, 0);
  v_cash           numeric(14,2) := coalesce(p_cash, 0);
  v_bank           numeric(14,2) := coalesce(p_bank, 0);
  v_total          numeric(14,2);
  v_txn            uuid;
  v_skim_txn       uuid;
  v_remaining      numeric(14,2);
  v_inv            record;
  v_apply          numeric(14,2);
  v_cash_acc       uuid;
  v_checks_acc     uuid;
  v_payable_acc    uuid;
  v_bank_acc       uuid;
  v_drawer_acc     uuid;
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

  if v_cash < 0 then
    raise exception 'المبلغ النقدي غير صالح';
  end if;
  if v_drawer < 0 then
    raise exception 'مبلغ الصندوق غير صالح';
  end if;
  if v_bank < 0 then
    raise exception 'المبلغ البنكي غير صالح';
  end if;

  -- قفل الشيكات المطلوبة قبل حساب المجموع يمنع سباق التزامن.
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

  v_total := v_cash + v_drawer + v_bank + v_checks_total;
  if v_total <= 0 then raise exception 'لا يوجد مبلغ للسداد'; end if;

  select id into v_cash_acc    from accounts where code = 'accumulated_cash';
  select id into v_checks_acc  from accounts where code = 'checks_on_hand';
  select id into v_payable_acc from accounts where code = 'suppliers_payable';
  select id into v_bank_acc    from accounts where code = 'bank';

  -- ── حركة التفريغ المنفصلة (إن أُخذ نقد من صندوق المبيعات) ──
  if v_drawer > 0 then
    select id into v_drawer_acc from accounts where code = 'cash_drawer' for update;

    insert into transactions(type, total, user_id, note)
    values ('liquidity_transfer', v_drawer, p_actor, 'تفريغ لإتمام سداد مورد')
    returning id into v_skim_txn;

    insert into ledger_entries(transaction_id, account_id, credit) values (v_skim_txn, v_drawer_acc, v_drawer);
    update accounts set balance = balance - v_drawer where id = v_drawer_acc;

    insert into ledger_entries(transaction_id, account_id, debit) values (v_skim_txn, v_cash_acc, v_drawer);
    update accounts set balance = balance + v_drawer where id = v_cash_acc;

    insert into audit_log(actor, action, entity, entity_id, payload)
    values (p_actor, 'skim_drawer', 'account', v_drawer_acc,
            jsonb_build_object('amount', v_drawer, 'txn', v_skim_txn, 'reason', 'pay_supplier'));
  end if;

  -- ── حركة السداد ──
  insert into transactions(type, total, user_id, note, supplier_id)
  values ('payment', v_total, p_actor, 'سداد متعدد المصادر', p_supplier)
  returning id into v_txn;

  -- النقد المدفوع من المتراكم = النقد المباشر + ما فُرِّغ من الدرج (صار بالمتراكم).
  if (v_cash + v_drawer) > 0 then
    insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_cash_acc, v_cash + v_drawer);
    update accounts set balance = balance - (v_cash + v_drawer) where id = v_cash_acc;
  end if;

  -- المدفوع من البنك (شيك/تحويل بنكي).
  if v_bank > 0 then
    insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_bank_acc, v_bank);
    update accounts set balance = balance - v_bank where id = v_bank_acc;
  end if;

  if v_checks_total > 0 then
    insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_checks_acc, v_checks_total);
    update accounts set balance = balance - v_checks_total where id = v_checks_acc;
    update checks set status = 'endorsed', endorsed_to = p_supplier
    where id = any(p_check_ids) and status = 'available';
    insert into transaction_checks(transaction_id, check_id, prev_status, prev_endorsed_to)
    select v_txn, id, 'available'::check_status, null from unnest(p_check_ids) as id;
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
          jsonb_build_object('cash', v_cash, 'drawer', v_drawer, 'bank', v_bank,
                             'checks', v_checks_total, 'txn', v_txn, 'skim_txn', v_skim_txn,
                             'stardust', v_stardust));

  return v_txn;
end; $$;

revoke execute on function pay_supplier_impl(uuid, numeric, numeric, numeric, uuid[], uuid)
  from public, anon, authenticated;

-- غلاف ربط الهوية (نفس نمط bind_actor).
create function pay_supplier(
  p_supplier  uuid,
  p_cash      numeric,
  p_drawer    numeric,
  p_bank      numeric,
  p_check_ids uuid[],
  p_actor     uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_actor is distinct from auth.uid() then
    raise exception 'ليس لديك صلاحية لتنفيذ هذه العملية' using errcode = '42501';
  end if;
  return pay_supplier_impl(p_supplier, p_cash, p_drawer, p_bank, p_check_ids, p_actor);
end; $$;

revoke execute on function pay_supplier(uuid, numeric, numeric, numeric, uuid[], uuid) from public, anon;
grant  execute on function pay_supplier(uuid, numeric, numeric, numeric, uuid[], uuid) to authenticated;
