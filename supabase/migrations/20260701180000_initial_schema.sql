-- ╔═══ حاويات المال: قانون الحفظ ═══╗
create type account_type as enum ('cash_drawer','accumulated_cash','bank','checks_on_hand');
create table accounts (
  id uuid primary key default gen_random_uuid(),
  code account_type not null unique,
  name_ar text not null,
  balance numeric(14,2) not null default 0   -- الرصيد الجاري
);

-- الملفات الشخصية + الأدوار (مربوطة بـ Supabase Auth)
create type user_role as enum ('super_admin','admin','monitor','cashier');
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role user_role not null default 'cashier',
  stardust integer not null default 0,        -- رصيد غبار النجوم
  unlocked_planets text[] default '{}',
  created_at timestamptz default now()
);

-- الموردون
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  visit_days int[],                            -- أيام الزيارة (0=الأحد)
  balance numeric(14,2) not null default 0,    -- إجمالي الدين الحالي
  risk_score int not null default 0,           -- مؤشر الجاذبية (المخاطر)
  red_flag boolean not null default false,
  red_flag_note text,
  created_at timestamptz default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- الفواتير (مع منع التكرار)
create table invoices (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id),
  paper_no text not null,                      -- رقم الفاتورة الورقية
  amount numeric(14,2) not null check (amount >= 0),
  paid numeric(14,2) not null default 0,
  remaining numeric(14,2) generated always as (amount - paid) stored,
  due_date date,
  image_url text,                              -- Supabase Storage
  is_deleted boolean not null default false,   -- حذف ناعم
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  unique (supplier_id, paper_no)               -- التحقق المزدوج: لا وهم مالي
);

-- محفظة الشيكات المجرية
create type check_status as enum ('available','endorsed','cashed','bounced');
create table checks (
  id uuid primary key default gen_random_uuid(),
  amount numeric(14,2) not null check (amount > 0),
  due_date date,
  drawer_name text,                            -- صاحب الشيك
  image_url text,
  status check_status not null default 'available',
  endorsed_to uuid references suppliers(id),   -- التاجر المُجيَّر إليه
  created_at timestamptz default now()
);

-- رأس الحركة المالية
create type txn_type as enum ('payment','expense','sales_skim','liquidity_transfer','reversal');
create table transactions (
  id uuid primary key default gen_random_uuid(),
  type txn_type not null,
  total numeric(14,2) not null,
  user_id uuid references profiles(id),
  reversed_by uuid references transactions(id), -- آلة عكس الزمن
  note text,
  created_at timestamptz default now()
);

-- سطور القيد المزدوج (يجب أن تتوازن)
create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  account_id uuid not null references accounts(id),
  debit numeric(14,2) not null default 0,
  credit numeric(14,2) not null default 0
);

-- الصندوق الأسود: سجل تدقيق غير قابل للتعديل
create table audit_log (
  id bigint generated always as identity primary key,
  actor uuid references profiles(id),
  action text not null,
  entity text,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz default now()
);
