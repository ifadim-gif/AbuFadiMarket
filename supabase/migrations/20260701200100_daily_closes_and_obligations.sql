-- ── daily_closes: طقس إغلاق المدار اليومي ──
-- سجل append-only (كـ audit_log): لا يُكتب إلا عبر close_daily_orbit RPC.
create table daily_closes (
  id uuid primary key default gen_random_uuid(),
  close_date date not null unique,
  expected_drawer numeric(14,2) not null,
  counted_drawer numeric(14,2) not null,
  variance numeric(14,2) generated always as (counted_drawer - expected_drawer) stored,
  transaction_id uuid references transactions(id),
  stardust_awarded integer not null default 0,
  closed_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table daily_closes enable row level security;

create policy "read_daily_closes" on daily_closes for select
  using (auth.role() = 'authenticated');
-- بدون سياسة INSERT/UPDATE/DELETE: الكتابة حصرًا عبر close_daily_orbit.

grant select, insert, update, delete on daily_closes to anon, authenticated, service_role;

-- ── expected_obligations: التزامات متوقّعة (شيكات صادرة من بنك المحل،
-- ضريبة، تأمين، مصاريف سيارة...) لتغذية سديم التدفق النقدي بواقع لا يمثّله
-- المخطط الحالي (لا يوجد جدول "شيكات صادرة" مستقل). إدخال يدوي بسيط من
-- الإدارة، وليس جزءًا من محرّك القيد المزدوج — مجرّد تقدير للتنبؤ.
create table expected_obligations (
  id uuid primary key default gen_random_uuid(),
  amount numeric(14,2) not null check (amount > 0),
  expected_date date not null,
  category text,
  note text,
  is_settled boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

alter table expected_obligations enable row level security;

create policy "read_expected_obligations" on expected_obligations for select
  using (auth.role() = 'authenticated');

create policy "write_expected_obligations_admin" on expected_obligations for insert
  with check (is_admin());
create policy "update_expected_obligations_admin" on expected_obligations for update
  using (is_admin());
create policy "delete_expected_obligations_admin" on expected_obligations for delete
  using (is_admin());

grant select, insert, update, delete on expected_obligations to anon, authenticated, service_role;
