🌌 الدستور المعماري لنظام Fadi Logic Pro — الإصدار الكوني (Supabase + GitHub)


تحويل النظام من فلك Google Apps Script / Sheets إلى مدارٍ احترافيٍّ حقيقي: واجهة ثابتة على GitHub Pages، ودماغٌ خلفيٌّ كامل على Supabase (PostgreSQL حقيقي بـ ACID).




1. الحكم النهائي على الملاءمة (Critical Assessment)

التصميم الأصلي سليم في تقسيمه للمجالات (مستخدمون، موردون، فواتير، شيكات، سجل حركات)، وفكرة "سجل الحركات الكوني" هي في جوهرها محاولة للوصول إلى دفتر القيد المزدوج دون تسميته. لكنه كان مُقيَّدًا بسقفٍ زجاجيٍّ بسبب البيئة:

الخطر في Google Sheetsالإصلاح في Supabase / PostgreSQLلا توجد معاملات ذرّية (ACID) — السداد متعدد المصادر يلمس الشيكات + النقد + الفواتير + السجل، وأي انقطاع في المنتصف = دفاتر مكسورةالدالة كلها تُنفَّذ كمعاملة واحدة: إمّا تنجح بالكامل أو تتراجع بالكاملتعارض الكاشيرات (Race Conditions) عند العمل المتزامن وفقدان التحديثاتقفل الصفوف (Row Locking) و Serializable Transactionsتخزين المال كأرقام عشرية (Float) → أخطاء تقريب نقديةنوع NUMERIC(14,2) الدقيق — لا فقدان لأي قرشلا تكامل مرجعي → سجلّات يتيمة رغم ربط الـ UUIDمفاتيح أجنبية (Foreign Keys) تمنع اليتم نهائيًاتدهور الأداء مع كثرة الصفوف + حصص تنفيذ Apps Scriptفهارس PostgreSQL واستعلامات بمللي ثانيةمصادقة منزلية (كلمة مرور مشفّرة داخل ورقة)Supabase Auth حقيقي + RLS على مستوى الصفRealtime صعب (السوبرنوفا الجماعية)Supabase Realtime يبثّ الحدث لكل الشاشات لحظيًا

الخلاصة: الانتقال ليس ترفًا، بل هو ما يحوّل الرؤية من نموذجٍ هشٍّ إلى نظامٍ ماليٍّ يصمد.


2. المعمارية الكونية الجديدة (Layers)

┌──────────────────────── المستخدم (متصفح / PWA على الهاتف) ────────────────────────┐
│  React + Vite (SPA)  •  Glassmorphism RTL  •  Service Worker (Offline Shell)        │
└───────────────┬──────────────────────────────────────────────┬─────────────────────┘
                │ (HTTPS)                                        │ (WebSocket)
        ┌───────▼────────┐                              ┌────────▼────────┐
        │  GitHub Pages  │  ← استضافة ثابتة فقط          │ Supabase        │
        │  (نشر آلي عبر  │                              │ Realtime        │
        │  GitHub Actions)│                              └─────────────────┘
        └────────────────┘
                                  Supabase (الدماغ الخلفي)
        ┌─────────────┬─────────────┬──────────────┬───────────────┬──────────────┐
        │  Auth       │ PostgreSQL  │ RLS (الأمان) │ Storage (الصور)│ Edge Funcs   │
        │ (الأدوار)   │ + RPC ذرّية │ على كل صف    │ بدل Drive     │ (Deno/Webhooks)│
        └─────────────┴─────────────┴──────────────┴───────────────┴──────────────┘

ملاحظة أمنية جوهرية: GitHub Pages تخدم ملفّات ثابتة فقط، لذا مفتاح Supabase العلني (anon key) يظهر في الواجهة — وهذا آمن لأن RLS هو من يحمي البيانات فعليًا. أمّا مفتاح service_role فلا يوضع في الواجهة أبدًا؛ مكانه Edge Functions فقط.


3. مكدّس التقنيات (Tech Stack المعتمد)

الطبقةالأداةالسببالإطارReact 18 + Viteسرعة، نظام مكوّنات يناسب التعقيداللغةJavaScript (أو TypeScript للأمان)اختيارك في الإطلاقالتصميمTailwind CSS + RTLزجاجية ووضع داكن بسرعةالحركةFramer Motionدوران الكواكب، المدارات، المذنّباتالرسومRechartsلوحات الأداء وسديم التدفّقالتنبيهاتSweetAlert2معيارك المعتمدالأيقوناتFontAwesome 6معيارك المعتمدالخطوطCairo / Tajawalمعيارك المعتمدالبياناتTanStack Query + supabase-jsتخزين مؤقت ذكي ومزامنةPWAvite-plugin-pwa (Workbox)التشغيل دون اتصالالخلفيةSupabase (Postgres 15, Auth, RLS, Realtime, Storage)الدماغ الكاملالمنطق الذرّيدوال PostgreSQL (PL/pgSQL) عبر RPCضمان الذرّية الماليةالتطوير المحليSupabase CLI (Docker) + Vite Dev"ابنِ محليًا أولًا" حرفيًاالنشرGitHub Actions → GitHub Pagesنشر آلي عند كل دفعة


4. قانون حفظ الطاقة: المحرّك المحاسبي (أهم إضافة هندسية)

أعيد تأطير "سجل الحركات الكوني" ليصبح دفتر قيدٍ مزدوجٍ حقيقيًّا، مُلبَّسًا بثوبك الكوني: "المال لا يُخلَق ولا يُفنى، بل ينتقل بين الحاويات" (قانون الحفظ).

كل حركة = سطورُ مدين/دائن متوازنة عبر "حاويات المال" (الدرج، النقد المتراكم، البنك، الشيكات بحوزتنا). نتيجة ذلك:


التراجع (آلة عكس الزمن) يصبح بسيطًا ومضمونًا: نسجّل قيدًا عكسيًّا مقابلًا، ولا نحذف سجلًّا ماليًّا أبدًا.
التحقّق الدائم: استعلامٌ واحد يثبت أن مجموع المدين = مجموع الدائن. أي اختلال = إنذار فوري.



5. مخطّط قاعدة البيانات (SQL — جاهز للّصق في Supabase)

sql-- ╔═══ حاويات المال: قانون الحفظ ═══╗
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


6. المحرّك الذرّي: دالة السداد متعدد المصادر (RPC)

مثالٌ مرجعيٌّ يوضّح الذرّية + التجيير + FIFO + القيد المزدوج + الصندوق الأسود — نُحكِمه أثناء البناء:

sqlcreate or replace function pay_supplier(
  p_supplier  uuid,
  p_cash      numeric,
  p_check_ids uuid[],
  p_actor     uuid
) returns uuid
language plpgsql security definer as $$
declare
  v_checks_total numeric(14,2) := 0;
  v_total        numeric(14,2);
  v_txn          uuid;
  v_remaining    numeric(14,2);
  v_inv          record;
  v_apply        numeric(14,2);
  v_cash_acc     uuid;
  v_checks_acc   uuid;
begin
  -- نحسب الشيكات المتاحة فقط
  select coalesce(sum(amount),0) into v_checks_total
  from checks where id = any(p_check_ids) and status = 'available';

  v_total := coalesce(p_cash,0) + v_checks_total;
  if v_total <= 0 then raise exception 'لا يوجد مبلغ للسداد'; end if;

  insert into transactions(type, total, user_id, note)
  values ('payment', v_total, p_actor, 'سداد متعدد المصادر')
  returning id into v_txn;

  select id into v_cash_acc   from accounts where code = 'accumulated_cash';
  select id into v_checks_acc from accounts where code = 'checks_on_hand';

  -- قيد النقد (دائن) + خصم الرصيد
  if coalesce(p_cash,0) > 0 then
    insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_cash_acc, p_cash);
    update accounts set balance = balance - p_cash where id = v_cash_acc;
  end if;

  -- قيد الشيكات (دائن) + تجييرها للتاجر
  if v_checks_total > 0 then
    insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_checks_acc, v_checks_total);
    update accounts set balance = balance - v_checks_total where id = v_checks_acc;
    update checks set status='endorsed', endorsed_to=p_supplier
    where id = any(p_check_ids) and status='available';
  end if;

  -- تخفيض دين التاجر (الطرف المدين)
  update suppliers set balance = balance - v_total where id = p_supplier;

  -- تسديد الفواتير FIFO: الأقدم أولًا
  v_remaining := v_total;
  for v_inv in
    select id, (amount - paid) as due from invoices
    where supplier_id = p_supplier and is_deleted = false and (amount - paid) > 0
    order by coalesce(due_date, created_at::date), created_at
  loop
    exit when v_remaining <= 0;
    v_apply := least(v_remaining, v_inv.due);
    update invoices set paid = paid + v_apply where id = v_inv.id;
    v_remaining := v_remaining - v_apply;
  end loop;

  -- الصندوق الأسود
  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor,'pay_supplier','supplier',p_supplier,
          jsonb_build_object('cash',p_cash,'checks',v_checks_total,'txn',v_txn));

  return v_txn;
end; $$;

نفس الفلسفة تُبنى عليها بقية المحرّكات: skim_drawer (إفراغ الدرج)، bounce_check (الشيك الراجع + العلامة الحمراء)، وreverse_transaction (آلة عكس الزمن عبر قيدٍ عكسيٍّ لا حذف).


7. درع الأمان: RLS (مثال)

sqlalter table invoices enable row level security;

-- الجميع المصادَق عليهم يقرؤون
create policy "read_invoices" on invoices for select
  using (auth.role() = 'authenticated');

-- الإضافة/التعديل للإدارة فقط
create policy "write_invoices_admin" on invoices for insert with check (
  exists (select 1 from profiles p where p.id = auth.uid()
          and p.role in ('admin','super_admin'))
);

الأمان لم يعد في كود الواجهة (حيث يسهل تجاوزه)، بل في قلب قاعدة البيانات — حتى لو حاول مستخدمٌ مناداة الـ API مباشرة، يُمنَع.


8. التشغيل دون اتصال (Offline-First) — بصدقٍ هندسي

التشغيل الكامل دون اتصال مع قاعدةٍ علائقيةٍ أصعب بكثير منه مع localStorage. التوصية الآمنة:


العمليات المالية الحسّاسة (السداد، الإفراغ، التراجع) تبقى متّصلة إلزاميًا — لأنها تحتاج ذرّية الخادم.
الالتقاط فقط (إدخال فاتورة/مصروف كمسودّة) يُسمح به دون اتصال عبر صندوق صادر (Outbox) في IndexedDB، ثم مزامنة هادئة عند عودة الشبكة.


هكذا نحصل على راحة الميدان دون المخاطرة بانهيار التوازن المحاسبي.


9. ✨ إضافات فادي الإبداعية (تحليق بين الكواكب — لكن بفائدةٍ حقيقية)


🌫️ سديم التدفّق النقدي (Cash-Flow Nebula): يتنبّأ بالسيولة لـ 30 يومًا قادمًا اعتمادًا على تواريخ استحقاق الشيكات وأيام زيارة الموردين. ينذر بـ "ثقب أسود سيولة" حين تقلّ السيولة المتوقّعة عن الالتزامات.
☄️ تقويم زخّات الشهب (Meteor Shower Calendar): تقويمٌ بصريٌّ لتواريخ صرف الشيكات والفواتير المستحقّة — لا مفاجآت.
🪐 طقس إغلاق المدار اليومي (Daily Orbit Close): طقس تسويةٍ آخر اليوم — عدّ الدرج مقابل المتوقّع، قفل اليوم بلقطةٍ ثابتةٍ غير قابلة للتعديل، ومكافأة غبار النجوم على الإغلاق النظيف.
🌠 خريطة كوكبات الموردين (Supplier Constellation): رسمٌ علائقيٌّ يُظهر كل مورّد كنجمٍ يسطع بحسب مؤشّر الجاذبية (انضباط السداد، الشيكات الراجعة، العلامات الحمراء).
🛡️ الصندوق الأسود (Append-Only): سجل تدقيقٍ لا يُحذف ولا يُعدَّل، مع إمكانية سلسلة تجزئة (Hash Chain) لاحقًا لكشف أي عبث.
🔭 طابور مراجعة الشذوذ: أي إدخالٍ يشذّ بنسبة 40%+ عن المتوسّط يذهب لطابور مراجعةٍ صامتٍ للإدارة — لا يوقف الكاشير.
💥 السوبرنوفا اللحظية (Realtime): عند كسر الرقم القياسي للمبيعات، يبثّ Supabase Realtime الحدث فتحتفل كل الشاشات في آنٍ واحد فعليًّا (ما كان مستحيلًا على Sheets).


تبقى كل عناصرك الأصلية حيّة: غبار النجوم، الكواكب الدوّارة، المذنّبات، حزام الكويكبات، عصا القيادة المدارية (Radial FAB)، الذبذبات اللمسية، ورادار الموردين.


10. الواجهة الهولوغرافية (مبادئ التنفيذ)

خلفياتٌ فضائيةٌ متدرّجة داكنة، بطاقاتٌ زجاجيةٌ بـ backdrop-blur، حوافٌ نيونية تعكس الحالة (أخضر للمتاح، أحمر للمتأخّر)، خطوط Cairo/Tajawal، اتجاه RTL صارم، وتطبيق قاعدة التنوين دائمًا على الحرف الذي يسبق الألف.


11. خطة الإطلاق المرحلية


المرحلة 0 — محليًّا: تشغيل Supabase محليًّا عبر CLI (Docker) + Vite، تطبيق المخطّط وسياسات RLS وبياناتٍ تجريبية.
المرحلة 1 — النواة: المصادقة، الموردون، الفواتير، الشيكات، محرّك السداد، دفتر القيد.
المرحلة 2 — المجرّة: التحفيز، لوحات الأداء، السديم، السوبرنوفا اللحظية.
المرحلة 3 — الصقل: PWA دون اتصال، الذبذبات، عصا القيادة المدارية.
المرحلة 4 — النشر: مشروع Supabase سحابي + نشر GitHub Pages آليًّا عبر Actions.



<div align="center">
🛸 تمت البرمجة بواسطة فادي قرمطة 🛸

</div>