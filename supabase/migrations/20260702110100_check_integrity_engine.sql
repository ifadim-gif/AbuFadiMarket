-- ╔═══ المرحلة 4أ: نزاهة محرّك الشيكات والسداد ═══╗
-- 1) محفظتان جديدتان (رصيد صفر)  2) جدول تتبّع الشيكات في الحركات
-- 3) رقم مرجعي للشيك  4) إصلاح reverse_transaction (استرجاع حالة الشيكات)
-- 5) إعادة كتابة bounce_check (تحويل ديون)  6) pay_supplier ثلاثي المصادر

-- ── حسابا المحفظتين الجديدتين ──
insert into accounts (code, name_ar, balance) values
  ('customer_receivable', 'ذمم العملاء',        0),
  ('card_clearing',       'بطاقات قيد التحصيل', 0)
on conflict (code) do nothing;

-- ── جدول تتبّع الشيكات: لكل حركة تغيّر حالة شيك، نحفظ حالته السابقة ──
-- هذا حجر الأساس لإصلاح ثغرة عكس الزمن: reverse_transaction لم تكن تملك أي
-- وسيلة لمعرفة أي شيك بعينه تُعيد؛ الآن تقرأ الحالة السابقة الدقيقة من هنا.
create table transaction_checks (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  check_id uuid not null references checks(id),
  prev_status check_status not null,       -- الحالة قبل الحركة
  prev_endorsed_to uuid,                    -- التجيير قبل الحركة
  created_at timestamptz default now()
);

alter table transaction_checks enable row level security;

create policy "read_transaction_checks" on transaction_checks for select
  using (auth.role() = 'authenticated');
-- بدون سياسة INSERT: الكتابة حصرًا عبر دوال RPC بصلاحية security definer.

grant select, insert, update, delete on transaction_checks to anon, authenticated, service_role;

-- ── الرقم المرجعي للشيك (رقم حساب الزبون في نظام الكاش) ──
alter table checks add column customer_ref text;

-- ── pay_supplier: سداد ثلاثي المصادر (درج + نقد متراكم + شيكات) ──
-- p_drawer = نقد يُؤخذ من صندوق المبيعات مباشرة؛ في الخلفية يُنفَّذ كتفريغ
-- منفصل (liquidity_transfer) ثم سداد، فيبقى سجل التدقيق شفافًا.
drop function if exists pay_supplier(uuid, numeric, uuid[], uuid);

create or replace function pay_supplier(
  p_supplier  uuid,
  p_cash      numeric,
  p_drawer    numeric,
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
  v_total          numeric(14,2);
  v_txn            uuid;
  v_skim_txn       uuid;
  v_remaining      numeric(14,2);
  v_inv            record;
  v_apply          numeric(14,2);
  v_cash_acc       uuid;
  v_checks_acc     uuid;
  v_payable_acc    uuid;
  v_drawer_acc     uuid;
  v_drawer_bal     numeric(14,2);
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

  v_total := v_cash + v_drawer + v_checks_total;
  if v_total <= 0 then raise exception 'لا يوجد مبلغ للسداد'; end if;

  select id into v_cash_acc    from accounts where code = 'accumulated_cash';
  select id into v_checks_acc  from accounts where code = 'checks_on_hand';
  select id into v_payable_acc from accounts where code = 'suppliers_payable';

  -- ── حركة التفريغ المنفصلة (إن أُخذ نقد من صندوق المبيعات) ──
  -- تنقل v_drawer من الدرج للمتراكم تمامًا كـ skim_drawer، فيصبح متاحًا للدفع.
  if v_drawer > 0 then
    select id, balance into v_drawer_acc, v_drawer_bal
    from accounts where code = 'cash_drawer' for update;

    if v_drawer > v_drawer_bal then
      raise exception 'مبلغ الصندوق (%) يتجاوز رصيد الدرج الحالي (%)', v_drawer, v_drawer_bal;
    end if;

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

  if v_checks_total > 0 then
    insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_checks_acc, v_checks_total);
    update accounts set balance = balance - v_checks_total where id = v_checks_acc;
    update checks set status = 'endorsed', endorsed_to = p_supplier
    where id = any(p_check_ids) and status = 'available';
    -- تسجيل الحالة السابقة لكل شيك (available) لإتاحة عكس دقيق لاحقًا.
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
          jsonb_build_object('cash', v_cash, 'drawer', v_drawer, 'checks', v_checks_total,
                             'txn', v_txn, 'skim_txn', v_skim_txn, 'stardust', v_stardust));

  return v_txn;
end; $$;

-- ── bounce_check: نموذج تحويل الديون (الشيك الراجع ميّت لا يعود) ──
-- الشيك الراجع من حساب العميل لن يُصرف أبدًا: يُوسَم bounced ولا يعود لمحفظة
-- الشيكات. يُعاد دَين المورد علينا، ويُسجَّل دَين مقابل على العميل (ذمم عملاء)
-- سيدفعه نقدًا في الصندوق لاحقًا. القيد متوازن ذاتيًا (لا حركة نقدية الآن).
create or replace function bounce_check(
  p_check_id uuid,
  p_actor    uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_check          checks%rowtype;
  v_txn            uuid;
  v_receivable_acc uuid;
  v_payable_acc    uuid;
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

  select id into v_receivable_acc from accounts where code = 'customer_receivable';
  select id into v_payable_acc    from accounts where code = 'suppliers_payable';

  insert into transactions(type, total, user_id, note, supplier_id)
  values ('reversal', v_check.amount, p_actor, 'شيك راجع', v_check.endorsed_to)
  returning id into v_txn;

  -- تسجيل الحالة السابقة (endorsed) ليكون الترجيع نفسه قابلًا للعكس.
  insert into transaction_checks(transaction_id, check_id, prev_status, prev_endorsed_to)
  values (v_txn, p_check_id, 'endorsed'::check_status, v_check.endorsed_to);

  -- مدين ذمم العملاء (العميل صار مدينًا لنا) = دائن ذمم الموردين (نحن مدينون ثانيةً).
  insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_receivable_acc, v_check.amount);
  update accounts set balance = balance + v_check.amount where id = v_receivable_acc;

  insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_payable_acc, v_check.amount);
  update accounts set balance = balance + v_check.amount where id = v_payable_acc;

  update suppliers
  set balance = balance + v_check.amount,
      red_flag = true,
      red_flag_note = coalesce(red_flag_note || E'\n', '')
        || 'شيك راجع بمبلغ ' || v_check.amount::text || ' بتاريخ ' || now()::date
  where id = v_check.endorsed_to;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor, 'bounce_check', 'check', p_check_id,
          jsonb_build_object('amount', v_check.amount, 'txn', v_txn, 'model', 'debt_shift'));

  return v_txn;
end; $$;

-- ── reverse_transaction: إصلاح استرجاع حالة الشيكات ──
-- بالإضافة لعكس القيود/التخصيصات/رصيد المورد، تُعيد الآن كل شيك تأثّر بالحركة
-- إلى حالته وتجييره السابقَين المسجَّلَين في transaction_checks.
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
  v_chk             record;
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

  -- استرجاع حالة كل شيك تأثّر بالحركة إلى ما كان عليه قبلها (إصلاح الثغرة).
  for v_chk in
    select check_id, prev_status, prev_endorsed_to from transaction_checks
    where transaction_id = p_transaction_id
  loop
    update checks set status = v_chk.prev_status, endorsed_to = v_chk.prev_endorsed_to
    where id = v_chk.check_id;
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
