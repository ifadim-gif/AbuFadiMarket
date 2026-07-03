-- درع الأمان: تفعيل RLS على كل الجداول الحساسة، بامتداد النمط المرجعي (invoices)
-- على بقية الجداول: قراءة لكل مصادَق، وكتابة/تعديل لأدوار admin/super_admin فقط.

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role in ('admin','super_admin')
  );
$$;

-- ── accounts ──────────────────────────────────────────────
alter table accounts enable row level security;

create policy "read_accounts" on accounts for select
  using (auth.role() = 'authenticated');

create policy "write_accounts_admin" on accounts for insert with check (is_admin());
create policy "update_accounts_admin" on accounts for update using (is_admin());
create policy "delete_accounts_admin" on accounts for delete using (is_admin());

-- ── profiles ──────────────────────────────────────────────
alter table profiles enable row level security;

create policy "read_own_or_admin_profiles" on profiles for select
  using (auth.uid() = id or is_admin());

create policy "update_own_or_admin_profiles" on profiles for update
  using (auth.uid() = id or is_admin());

create policy "write_profiles_admin" on profiles for insert with check (is_admin());
create policy "delete_profiles_admin" on profiles for delete using (is_admin());

-- ── suppliers ─────────────────────────────────────────────
alter table suppliers enable row level security;

create policy "read_suppliers" on suppliers for select
  using (auth.role() = 'authenticated');

create policy "write_suppliers_admin" on suppliers for insert with check (is_admin());
create policy "update_suppliers_admin" on suppliers for update using (is_admin());
create policy "delete_suppliers_admin" on suppliers for delete using (is_admin());

-- ── categories ────────────────────────────────────────────
alter table categories enable row level security;

create policy "read_categories" on categories for select
  using (auth.role() = 'authenticated');

create policy "write_categories_admin" on categories for insert with check (is_admin());
create policy "update_categories_admin" on categories for update using (is_admin());
create policy "delete_categories_admin" on categories for delete using (is_admin());

-- ── invoices (المثال المرجعي في الدستور) ─────────────────
alter table invoices enable row level security;

create policy "read_invoices" on invoices for select
  using (auth.role() = 'authenticated');

create policy "write_invoices_admin" on invoices for insert with check (is_admin());
create policy "update_invoices_admin" on invoices for update using (is_admin());
create policy "delete_invoices_admin" on invoices for delete using (is_admin());

-- ── checks ────────────────────────────────────────────────
alter table checks enable row level security;

create policy "read_checks" on checks for select
  using (auth.role() = 'authenticated');

create policy "write_checks_admin" on checks for insert with check (is_admin());
create policy "update_checks_admin" on checks for update using (is_admin());
create policy "delete_checks_admin" on checks for delete using (is_admin());

-- ── transactions ──────────────────────────────────────────
-- ملاحظة: في المرحلة 1 ستُنشأ الحركات حصريًا عبر دوال RPC بصلاحية security definer
-- (مثل pay_supplier)، لذا سياسة الكتابة هنا مؤقتة للإدارة فقط إلى حين بناء المحرّك.
alter table transactions enable row level security;

create policy "read_transactions" on transactions for select
  using (auth.role() = 'authenticated');

create policy "write_transactions_admin" on transactions for insert with check (is_admin());

-- ── ledger_entries ────────────────────────────────────────
alter table ledger_entries enable row level security;

create policy "read_ledger_entries" on ledger_entries for select
  using (auth.role() = 'authenticated');

create policy "write_ledger_entries_admin" on ledger_entries for insert with check (is_admin());

-- ── audit_log (الصندوق الأسود) ───────────────────────────
-- append-only: لا سياسة UPDATE أو DELETE على الإطلاق لأي دور.
-- الإدراج سيتم لاحقًا عبر دوال security definer فقط؛ الإدارة تقرأ للتدقيق.
alter table audit_log enable row level security;

create policy "read_audit_log_admin" on audit_log for select
  using (is_admin());
