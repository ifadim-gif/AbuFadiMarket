-- بيانات تجريبية للتطوير المحلي فقط (المرحلة 0)

-- ── حاويات المال الأربع (بيانات مرجعية أساسية، ليست تجريبية بحتة) ──
insert into accounts (code, name_ar, balance) values
  ('cash_drawer',       'درج النقد',          500.00),
  ('accumulated_cash',  'النقد المتراكم',     12000.00),
  ('bank',              'البنك',              50000.00),
  ('checks_on_hand',    'الشيكات بحوزتنا',    8000.00),
  -- ذمم الموردين: تساوي مجموع أرصدة الموردين الثلاثة أدناه (3200+950+6100)
  -- حتى يتوازن قانون حفظ الطاقة منذ لحظة التمهيد الأولى.
  ('suppliers_payable', 'ذمم الموردين',       10250.00);

-- ── مستخدمون تجريبيون (auth.users + profiles) ──
-- ملاحظة: هذا الإدراج المباشر في auth.users مناسب فقط لبيئة التطوير المحلية.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, last_sign_in_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated', 'authenticated',
    'admin@fadilogic.local',
    crypt('Password123!', gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated',
    'cashier@fadilogic.local',
    crypt('Password123!', gen_salt('bf')),
    now(), now(),
    '{"provider":"email","providers":["email"]}', '{}',
    now(), now(), '', '', '', ''
  );

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values
  (
    gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
    jsonb_build_object('sub', '11111111-1111-1111-1111-111111111111', 'email', 'admin@fadilogic.local'),
    'email', now(), now(), now()
  ),
  (
    gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
    jsonb_build_object('sub', '22222222-2222-2222-2222-222222222222', 'email', 'cashier@fadilogic.local'),
    'email', now(), now(), now()
  );

insert into profiles (id, full_name, role, stardust) values
  ('11111111-1111-1111-1111-111111111111', 'فادي (المدير العام)', 'super_admin', 500),
  ('22222222-2222-2222-2222-222222222222', 'كاشير تجريبي',        'cashier',     20);

-- ── فئات تجريبية ──
insert into categories (name) values
  ('مواد غذائية'),
  ('مشروبات'),
  ('صيانة');

-- ── موردون تجريبيون ──
insert into suppliers (id, name, phone, visit_days, balance, risk_score, red_flag) values
  ('33333333-3333-3333-3333-333333333333', 'مؤسسة النجم للتجارة', '0599111222', '{0,3}', 3200.00, 15, false),
  ('44444444-4444-4444-4444-444444444444', 'شركة المدار للمواد الغذائية', '0599333444', '{1,4}', 950.00, 5, false),
  ('55555555-5555-5555-5555-555555555555', 'تجارة الكويكب', '0599555666', '{2}', 6100.00, 62, true);

-- ── فواتير تجريبية ──
insert into invoices (supplier_id, paper_no, amount, paid, due_date, created_by) values
  ('33333333-3333-3333-3333-333333333333', 'INV-1001', 2000.00, 500.00,  current_date + 10, '11111111-1111-1111-1111-111111111111'),
  ('33333333-3333-3333-3333-333333333333', 'INV-1002', 1200.00, 0.00,    current_date + 20, '11111111-1111-1111-1111-111111111111'),
  ('44444444-4444-4444-4444-444444444444', 'INV-2001', 950.00,  950.00,  current_date - 5,  '22222222-2222-2222-2222-222222222222'),
  ('55555555-5555-5555-5555-555555555555', 'INV-3001', 6100.00, 0.00,    current_date - 15, '11111111-1111-1111-1111-111111111111');

-- ── شيكات تجريبية ──
insert into checks (amount, due_date, drawer_name, status, endorsed_to) values
  (1500.00, current_date + 15, 'عميل الفجر التجاري', 'available', null),
  (3000.00, current_date + 30, 'مؤسسة الشروق',       'available', null),
  (800.00,  current_date - 3,  'محل السلام',          'endorsed',  '33333333-3333-3333-3333-333333333333');
