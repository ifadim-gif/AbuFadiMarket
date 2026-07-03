-- ╔═══ المرحلة 4ب: المبيعات والذمم والباك أوفيس ═══╗
-- اصطلاح المدين/الدائن (امتداد للقسم 6):
--   أصول (cash_drawer, accumulated_cash, bank, checks_on_hand,
--         customer_receivable, card_clearing): مدين يزيد، دائن ينقص.
--   التزام (suppliers_payable): دائن يزيد، مدين ينقص.
--   إيراد (sales_revenue): دائن يزيد. كل بيع = مدين أصل + دائن إيراد،
--     فيبقى مجموع المدين = مجموع الدائن دائمًا.

-- ── حساب الإيرادات ──
insert into accounts (code, name_ar, balance) values
  ('sales_revenue', 'إيرادات المبيعات', 0)
on conflict (code) do nothing;

-- ── غرض الشيك: بيع جديد أم تحصيل ذمّة عميل ──
alter table checks add column purpose text not null default 'sale'
  check (purpose in ('sale', 'receivable_settlement'));

-- ── تقرير المبيعات اليومي (append-only، RPC فقط) ──
create table daily_sales_reports (
  id uuid primary key default gen_random_uuid(),
  work_date date not null unique,
  cash_sales      numeric(14,2) not null default 0,
  card_sales      numeric(14,2) not null default 0,
  check_sales     numeric(14,2) not null default 0,
  credit_invoice  numeric(14,2) not null default 0,   -- חשبونية מס'
  credit_delivery numeric(14,2) not null default 0,   -- תעודת משלוח
  recv_cash       numeric(14,2) not null default 0,
  recv_check      numeric(14,2) not null default 0,
  recv_card       numeric(14,2) not null default 0,
  transaction_id  uuid references transactions(id),
  created_by      uuid references profiles(id),
  created_at      timestamptz default now()
);

alter table daily_sales_reports enable row level security;

create policy "read_daily_sales_reports" on daily_sales_reports for select
  using (auth.role() = 'authenticated');
-- بدون سياسة كتابة: يُكتب حصرًا عبر record_daily_sales.

grant select, insert, update, delete on daily_sales_reports to anon, authenticated, service_role;

-- ── create_check: تسجيل شيك مع ترحيل قيده (يُصلح فجوة عدم الترحيل) ──
create or replace function create_check(
  p_amount       numeric,
  p_purpose      text,
  p_actor        uuid,
  p_due_date     date default null,
  p_drawer_name  text default null,
  p_customer_ref text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_check_id    uuid;
  v_txn         uuid;
  v_checks_acc  uuid;
  v_credit_acc  uuid;
begin
  if not exists (
    select 1 from profiles where id = p_actor and role in ('admin', 'super_admin', 'cashier')
  ) then
    raise exception 'ليس لديك صلاحية لتنفيذ هذه العملية' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'مبلغ الشيك غير صالح';
  end if;
  if coalesce(p_purpose, 'sale') not in ('sale', 'receivable_settlement') then
    raise exception 'غرض الشيك غير صالح';
  end if;

  insert into checks (amount, due_date, drawer_name, customer_ref, status, purpose)
  values (p_amount, p_due_date, p_drawer_name, p_customer_ref, 'available', coalesce(p_purpose, 'sale'))
  returning id into v_check_id;

  select id into v_checks_acc from accounts where code = 'checks_on_hand';

  if coalesce(p_purpose, 'sale') = 'sale' then
    select id into v_credit_acc from accounts where code = 'sales_revenue';
    insert into transactions(type, total, user_id, note)
    values ('sale', p_amount, p_actor, 'بيع بشيك')
    returning id into v_txn;
  else
    select id into v_credit_acc from accounts where code = 'customer_receivable';
    insert into transactions(type, total, user_id, note)
    values ('receivable_settlement', p_amount, p_actor, 'تحصيل ذمّة بشيك')
    returning id into v_txn;
  end if;

  -- مدين محفظة الشيكات، دائن (الإيراد أو ذمم العملاء).
  insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_checks_acc, p_amount);
  update accounts set balance = balance + p_amount where id = v_checks_acc;

  insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_credit_acc, p_amount);
  -- إيراد: دائن يزيد رصيده. ذمم عملاء (أصل): دائن ينقص رصيده.
  if coalesce(p_purpose, 'sale') = 'sale' then
    update accounts set balance = balance + p_amount where id = v_credit_acc;
  else
    update accounts set balance = balance - p_amount where id = v_credit_acc;
  end if;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor, 'create_check', 'check', v_check_id,
          jsonb_build_object('amount', p_amount, 'purpose', coalesce(p_purpose, 'sale'), 'txn', v_txn));

  return v_check_id;
end; $$;

-- ── record_daily_sales: ترحيل بنود التقرير غير النقدية غير الشيكية ──
-- (البطاقات + الذمم + تحصيل الذمم بالبطاقة). النقدي والشيكات تُخزَّن كأرقام
-- للسجل والمطابقة فقط (النقدي مؤجَّل لـ4ج، والشيكات تُرحَّل فرديًا عبر create_check).
create or replace function record_daily_sales(
  p_work_date      date,
  p_cash_sales     numeric,
  p_card_sales     numeric,
  p_check_sales    numeric,
  p_credit_invoice numeric,
  p_credit_delivery numeric,
  p_recv_cash      numeric,
  p_recv_check     numeric,
  p_recv_card      numeric,
  p_actor          uuid
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_report_id   uuid;
  v_txn         uuid;
  v_card        numeric(14,2) := coalesce(p_card_sales, 0);
  v_credit      numeric(14,2) := coalesce(p_credit_invoice, 0) + coalesce(p_credit_delivery, 0);
  v_recv_card   numeric(14,2) := coalesce(p_recv_card, 0);
  v_revenue     numeric(14,2);
  v_card_acc    uuid;
  v_recv_acc    uuid;
  v_rev_acc     uuid;
begin
  if not exists (
    select 1 from profiles where id = p_actor and role in ('admin', 'super_admin', 'cashier')
  ) then
    raise exception 'ليس لديك صلاحية لتنفيذ هذه العملية' using errcode = '42501';
  end if;
  if p_work_date is null then
    raise exception 'تاريخ يوم العمل مطلوب';
  end if;
  if exists (select 1 from daily_sales_reports where work_date = p_work_date) then
    raise exception 'تقرير هذا اليوم مُسجَّل مسبقًا';
  end if;

  v_revenue := v_card + v_credit;

  -- تُنشأ حركة فقط إذا وُجد ما يُرحَّل (كنمط daily_closes عند فرق صفري).
  if (v_card + v_credit + v_recv_card) > 0 then
    select id into v_card_acc from accounts where code = 'card_clearing';
    select id into v_recv_acc from accounts where code = 'customer_receivable';
    select id into v_rev_acc  from accounts where code = 'sales_revenue';

    insert into transactions(type, total, user_id, note)
    values ('sale', v_revenue + v_recv_card, p_actor, 'تقرير مبيعات يومي')
    returning id into v_txn;

    -- مبيعات البطاقات: مدين بطاقات، دائن إيراد.
    if v_card > 0 then
      insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_card_acc, v_card);
      update accounts set balance = balance + v_card where id = v_card_acc;
    end if;

    -- مبيعات آجلة (ذمم): مدين ذمم عملاء، دائن إيراد.
    if v_credit > 0 then
      insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_recv_acc, v_credit);
      update accounts set balance = balance + v_credit where id = v_recv_acc;
    end if;

    if v_revenue > 0 then
      insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_rev_acc, v_revenue);
      update accounts set balance = balance + v_revenue where id = v_rev_acc;
    end if;

    -- تحصيل ذمّة ببطاقة: مدين بطاقات، دائن ذمم عملاء.
    if v_recv_card > 0 then
      insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_card_acc, v_recv_card);
      update accounts set balance = balance + v_recv_card where id = v_card_acc;

      insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_recv_acc, v_recv_card);
      update accounts set balance = balance - v_recv_card where id = v_recv_acc;
    end if;
  end if;

  insert into daily_sales_reports(
    work_date, cash_sales, card_sales, check_sales, credit_invoice, credit_delivery,
    recv_cash, recv_check, recv_card, transaction_id, created_by)
  values (p_work_date, coalesce(p_cash_sales,0), v_card, coalesce(p_check_sales,0),
          coalesce(p_credit_invoice,0), coalesce(p_credit_delivery,0),
          coalesce(p_recv_cash,0), coalesce(p_recv_check,0), v_recv_card, v_txn, p_actor)
  returning id into v_report_id;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor, 'record_daily_sales', 'daily_sales_report', v_report_id,
          jsonb_build_object('work_date', p_work_date, 'revenue', v_revenue, 'txn', v_txn));

  return v_report_id;
end; $$;

-- ── deposit_check: إرسال شيك متاح للبنك (checks_on_hand → card_clearing) ──
create or replace function deposit_check(p_check_id uuid, p_actor uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_check      checks%rowtype;
  v_txn        uuid;
  v_checks_acc uuid;
  v_card_acc   uuid;
begin
  if not exists (select 1 from profiles where id = p_actor and role in ('admin','super_admin')) then
    raise exception 'ليس لديك صلاحية لتنفيذ هذه العملية' using errcode = '42501';
  end if;

  select * into v_check from checks where id = p_check_id for update;
  if not found then raise exception 'الشيك غير موجود'; end if;
  if v_check.status <> 'available' then
    raise exception 'لا يمكن إيداع شيك بحالة %', v_check.status;
  end if;

  select id into v_checks_acc from accounts where code = 'checks_on_hand';
  select id into v_card_acc   from accounts where code = 'card_clearing';

  insert into transactions(type, total, user_id, note)
  values ('liquidity_transfer', v_check.amount, p_actor, 'إيداع شيك للبنك')
  returning id into v_txn;

  insert into transaction_checks(transaction_id, check_id, prev_status, prev_endorsed_to)
  values (v_txn, p_check_id, 'available'::check_status, v_check.endorsed_to);

  update checks set status = 'deposited' where id = p_check_id;

  insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_card_acc, v_check.amount);
  update accounts set balance = balance + v_check.amount where id = v_card_acc;

  insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_checks_acc, v_check.amount);
  update accounts set balance = balance - v_check.amount where id = v_checks_acc;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor, 'deposit_check', 'check', p_check_id, jsonb_build_object('amount', v_check.amount, 'txn', v_txn));

  return v_txn;
end; $$;

-- ── clear_check: صرف شيك مودَع فعليًا (card_clearing → bank) ──
create or replace function clear_check(p_check_id uuid, p_actor uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_check     checks%rowtype;
  v_txn       uuid;
  v_card_acc  uuid;
  v_bank_acc  uuid;
begin
  if not exists (select 1 from profiles where id = p_actor and role in ('admin','super_admin')) then
    raise exception 'ليس لديك صلاحية لتنفيذ هذه العملية' using errcode = '42501';
  end if;

  select * into v_check from checks where id = p_check_id for update;
  if not found then raise exception 'الشيك غير موجود'; end if;
  if v_check.status <> 'deposited' then
    raise exception 'لا يمكن صرف شيك بحالة %', v_check.status;
  end if;

  select id into v_card_acc from accounts where code = 'card_clearing';
  select id into v_bank_acc from accounts where code = 'bank';

  insert into transactions(type, total, user_id, note)
  values ('liquidity_transfer', v_check.amount, p_actor, 'صرف شيك مودَع')
  returning id into v_txn;

  insert into transaction_checks(transaction_id, check_id, prev_status, prev_endorsed_to)
  values (v_txn, p_check_id, 'deposited'::check_status, v_check.endorsed_to);

  update checks set status = 'cashed' where id = p_check_id;

  insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_bank_acc, v_check.amount);
  update accounts set balance = balance + v_check.amount where id = v_bank_acc;

  insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_card_acc, v_check.amount);
  update accounts set balance = balance - v_check.amount where id = v_card_acc;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor, 'clear_check', 'check', p_check_id, jsonb_build_object('amount', v_check.amount, 'txn', v_txn));

  return v_txn;
end; $$;

-- ── collect_card_clearing: التحصيل الشهري للبطاقات (card_clearing → bank) ──
create or replace function collect_card_clearing(p_amount numeric, p_actor uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_txn      uuid;
  v_card_acc uuid;
  v_card_bal numeric(14,2);
  v_bank_acc uuid;
begin
  if not exists (select 1 from profiles where id = p_actor and role in ('admin','super_admin')) then
    raise exception 'ليس لديك صلاحية لتنفيذ هذه العملية' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'المبلغ غير صالح'; end if;

  select id, balance into v_card_acc, v_card_bal from accounts where code = 'card_clearing' for update;
  if p_amount > v_card_bal then
    raise exception 'المبلغ (%) يتجاوز رصيد محفظة التحصيل (%)', p_amount, v_card_bal;
  end if;
  select id into v_bank_acc from accounts where code = 'bank';

  insert into transactions(type, total, user_id, note)
  values ('liquidity_transfer', p_amount, p_actor, 'تحصيل بطاقات شهري')
  returning id into v_txn;

  insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_bank_acc, p_amount);
  update accounts set balance = balance + p_amount where id = v_bank_acc;

  insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_card_acc, p_amount);
  update accounts set balance = balance - p_amount where id = v_card_acc;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor, 'collect_card_clearing', 'account', v_card_acc, jsonb_build_object('amount', p_amount, 'txn', v_txn));

  return v_txn;
end; $$;

-- ── settle_receivable_transfer: سداد ذمّة عميل بتحويل بنكي (bank ← ذمم) ──
create or replace function settle_receivable_transfer(p_amount numeric, p_actor uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_txn      uuid;
  v_recv_acc uuid;
  v_recv_bal numeric(14,2);
  v_bank_acc uuid;
begin
  if not exists (select 1 from profiles where id = p_actor and role in ('admin','super_admin')) then
    raise exception 'ليس لديك صلاحية لتنفيذ هذه العملية' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'المبلغ غير صالح'; end if;

  select id, balance into v_recv_acc, v_recv_bal from accounts where code = 'customer_receivable' for update;
  if p_amount > v_recv_bal then
    raise exception 'المبلغ (%) يتجاوز إجمالي ذمم العملاء (%)', p_amount, v_recv_bal;
  end if;
  select id into v_bank_acc from accounts where code = 'bank';

  insert into transactions(type, total, user_id, note)
  values ('receivable_settlement', p_amount, p_actor, 'سداد ذمّة بتحويل بنكي')
  returning id into v_txn;

  insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_bank_acc, p_amount);
  update accounts set balance = balance + p_amount where id = v_bank_acc;

  insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_recv_acc, p_amount);
  update accounts set balance = balance - p_amount where id = v_recv_acc;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor, 'settle_receivable_transfer', 'account', v_recv_acc, jsonb_build_object('amount', p_amount, 'txn', v_txn));

  return v_txn;
end; $$;

-- ── close_daily_orbit: إضافة وسيط يوم العمل (close_date = يوم العمل المُختار) ──
drop function if exists close_daily_orbit(numeric, uuid);

create or replace function close_daily_orbit(
  p_counted   numeric,
  p_actor     uuid,
  p_work_date date default current_date
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_close_id   uuid;
  v_close_date date := coalesce(p_work_date, current_date);
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

  if exists (select 1 from daily_closes where close_date = v_close_date) then
    raise exception 'تم إغلاق هذا اليوم مسبقًا';
  end if;

  select id, balance into v_drawer_acc, v_expected from accounts where code = 'cash_drawer' for update;
  select id into v_accum_acc from accounts where code = 'accumulated_cash';

  v_variance := p_counted - v_expected;

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
  values (v_close_date, v_expected, p_counted, v_txn, v_stardust, p_actor)
  returning id into v_close_id;

  if v_stardust > 0 then
    perform award_stardust(p_actor, v_stardust);
  end if;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor, 'close_daily_orbit', 'daily_close', v_close_id,
          jsonb_build_object('work_date', v_close_date, 'expected', v_expected,
                             'counted', p_counted, 'variance', v_variance, 'stardust', v_stardust));

  return v_close_id;
end; $$;
