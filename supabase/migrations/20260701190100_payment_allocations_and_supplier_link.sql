-- سجل توزيع كل عملية سداد على الفواتير (FIFO) — يتيح لـ reverse_transaction
-- التراجع الدقيق عن invoices.paid بدل الاكتفاء برصيد المورد الإجمالي فقط.
create table payment_allocations (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  invoice_id uuid not null references invoices(id),
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz default now()
);

alter table payment_allocations enable row level security;

create policy "read_payment_allocations" on payment_allocations for select
  using (auth.role() = 'authenticated');
-- بدون سياسة INSERT: الكتابة حصرًا عبر دوال RPC بصلاحية security definer.

grant select, insert, update, delete on payment_allocations to anon, authenticated, service_role;

-- ربط الحركة بالمورد المعني (عند وجوده) — ضروري لـ reverse_transaction لمعرفة
-- أي مورد يُعاد ضبط رصيده الإجمالي، ومفيد أيضًا لاستعلام "كل حركات مورد X".
alter table transactions add column supplier_id uuid references suppliers(id);
