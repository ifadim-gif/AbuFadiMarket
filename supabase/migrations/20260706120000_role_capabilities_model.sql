-- ═══ نموذج القدرات (Capabilities) والأدوار الديناميكية — المرحلة أ (خلفية بحتة) ═══
--
-- الهدف: السماح بإنشاء أدوار جديدة ومنحها صلاحيات، دون أي تغيير سلوكي مرئي الآن.
--
-- قرار معماري (تقليل المخاطر إلى أدنى حد على نظام حيّ): القدرات الثلاث في هذا
-- المجال هرمية طبيعيًا (capture_documents ⊂ manage_finance ⊂ manage_system).
-- لذا نُبقي profiles.role (enum) "ظِلًّا" يُشتقّ تلقائيًا من الدور الجديد (role_id)
-- عبر محفّز. النتيجة: كل دوال RPC (~15) وسياسات RLS (~20) التي تقرأ enum تبقى
-- صحيحة حتى للأدوار المخصّصة — دون تعديل أيٍّ منها. هذا الترحيل إضافي بالكامل:
-- لا يمسّ أي منطق مالي أو سياسة قائمة.
--
-- role_id = مصدر الحقيقة للهوية والقدرات. role (enum) = ظِلّ مُشتقّ للتوافق.

-- ── 1) القدرات الثلاث الفعلية المستخدَمة في كامل النظام ──
create table capabilities (
  code text primary key,
  name_ar text not null,
  description_ar text,
  sort_order int not null default 0   -- ترتيب هرمي للعرض
);
insert into capabilities (code, name_ar, description_ar, sort_order) values
  ('capture_documents', 'التقاط المستندات', 'إنشاء فاتورة/شيك، تسجيل المبيعات والمصروفات، إفراغ الدرج، إغلاق اليوم', 1),
  ('manage_finance',    'الإدارة المالية',  'السداد، عكس الحركات، تعديل/حذف الفواتير والشيكات والموردين، الباك أوفيس، الالتزامات', 2),
  ('manage_system',     'إدارة النظام',     'الأرصدة الافتتاحية، ضبط الأدوار والصلاحيات', 3);

-- ── 2) الأدوار (قابلة للإنشاء). code للأدوار النظامية يطابق قيم enum user_role ──
create table roles (
  id uuid primary key default gen_random_uuid(),
  code text unique,                            -- نظامي: يطابق enum؛ مخصّص: null
  name_ar text not null,
  is_system boolean not null default false,    -- الأدوار الأربعة لا تُحذف
  created_at timestamptz default now()
);
insert into roles (code, name_ar, is_system) values
  ('super_admin', 'مدير عام', true),
  ('admin',       'إدارة',    true),
  ('monitor',     'مراقب',    true),
  ('cashier',     'كاشير',    true);

-- ── 3) مصفوفة الدور × القدرة (مغلقة هرميًا: أي قدرة تتضمّن الأدنى) ──
create table role_capabilities (
  role_id uuid not null references roles(id) on delete cascade,
  capability_code text not null references capabilities(code),
  primary key (role_id, capability_code)
);
-- تغذية مطابقة للسلوك الحالي بالضبط:
--   super_admin: الثلاث كلها | admin: مالية + التقاط | cashier: التقاط | monitor: لا شيء
insert into role_capabilities (role_id, capability_code)
select r.id, c.code
from roles r
join capabilities c on true
where (r.code = 'super_admin')
   or (r.code = 'admin'    and c.code in ('manage_finance', 'capture_documents'))
   or (r.code = 'cashier'  and c.code = 'capture_documents');

-- ── 4) ربط الملفات بالأدوار + التعبئة الرجعية + جعله إلزاميًا ──
alter table profiles add column role_id uuid references roles(id);
update profiles p set role_id = r.id from roles r where r.code = p.role::text;
alter table profiles alter column role_id set not null;

-- ── 5) دوال القدرات ──
-- يشتقّ قيمة enum المكافئة لقدرات دور (لتوافق دوال RPC القديمة). هرمي فلا فقدان.
create or replace function role_to_enum(p_role_id uuid) returns user_role
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from role_capabilities rc where rc.role_id = p_role_id and rc.capability_code = 'manage_system')     then 'super_admin'::user_role
    when exists (select 1 from role_capabilities rc where rc.role_id = p_role_id and rc.capability_code = 'manage_finance')     then 'admin'::user_role
    when exists (select 1 from role_capabilities rc where rc.role_id = p_role_id and rc.capability_code = 'capture_documents') then 'cashier'::user_role
    else 'monitor'::user_role
  end;
$$;

create or replace function has_capability(p_user uuid, p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    join role_capabilities rc on rc.role_id = p.role_id
    where p.id = p_user and rc.capability_code = p_code
  );
$$;

create or replace function has_capability(p_code text) returns boolean
language sql stable security definer set search_path = public as $$
  select has_capability(auth.uid(), p_code);
$$;

-- ── 6) محفّز مزامنة الظِّل + حماية تصعيد الصلاحيات ──
-- SECURITY INVOKER (بلا definer) ليعكس current_user المُنفِّذ الحقيقي: تعديل الدور
-- عبر REST (authenticated/service_role) يُرفَض؛ لا يُسمح إلا من محرّك الإدارة
-- (postgres: دالة RPC بصلاحية security definer، أو محرّر SQL في Studio).
create or replace function sync_profile_role() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.role_id is null and new.role is not null then
      select id into new.role_id from roles where code = new.role::text;
    end if;
  elsif tg_op = 'UPDATE' then
    if current_user <> 'postgres'
       and (new.role_id is distinct from old.role_id or new.role is distinct from old.role) then
      raise exception 'تعيين الدور يتم عبر أداة إدارة الصلاحيات فقط' using errcode = '42501';
    end if;
  end if;
  -- role_id مصدر الحقيقة؛ enum يُشتقّ منه دائمًا (يبقي RPC القديمة والسياسات صحيحة).
  if new.role_id is not null then
    new.role := role_to_enum(new.role_id);
  end if;
  return new;
end; $$;

create trigger trg_sync_profile_role
  before insert or update on profiles
  for each row execute function sync_profile_role();

-- ── 7) RLS للجداول الجديدة ──
alter table capabilities      enable row level security;
alter table roles             enable row level security;
alter table role_capabilities enable row level security;

-- القراءة: أي مصادَق (لعرض شاشة الأدوار). الكتابة: من يملك manage_system فقط.
create policy "read_capabilities" on capabilities for select using (auth.role() = 'authenticated');

create policy "read_roles" on roles for select using (auth.role() = 'authenticated');
create policy "write_roles_system"  on roles for insert with check (has_capability('manage_system'));
create policy "update_roles_system" on roles for update using (has_capability('manage_system'));
create policy "delete_roles_system" on roles for delete using (has_capability('manage_system') and not is_system);

create policy "read_role_capabilities" on role_capabilities for select using (auth.role() = 'authenticated');
create policy "write_role_capabilities_system"  on role_capabilities for insert with check (has_capability('manage_system'));
create policy "delete_role_capabilities_system" on role_capabilities for delete using (has_capability('manage_system'));

-- ── 8) منح/سحب صلاحيات التنفيذ (فخّ السحاب: سحب صريح من anon) ──
-- role_to_enum يناديها محفّز المزامنة بصلاحية المُنفِّذ (authenticated)، فيلزم منحها
-- له؛ لا تكشف شيئًا حسّاسًا (تدرّج القدرات مقروء أصلًا) وتقرأ داخليًا بصلاحية postgres.
revoke execute on function role_to_enum(uuid)          from public, anon;
grant  execute on function role_to_enum(uuid)          to authenticated;
revoke execute on function has_capability(uuid, text)  from public, anon;
grant  execute on function has_capability(uuid, text)  to authenticated;
revoke execute on function has_capability(text)        from public, anon;
grant  execute on function has_capability(text)        to authenticated;
