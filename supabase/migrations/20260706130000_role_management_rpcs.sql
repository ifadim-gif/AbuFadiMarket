-- ═══ المرحلة ب١: دوال إدارة الأدوار (RPC) + تشديد الكتابة ═══
--
-- كل الكتابة على roles/role_capabilities/profiles.role_id تمرّ حصريًا عبر هذه
-- الدوال (security definer، بوابة manage_system)، فتُفرَض ثابتتان جوهريتان:
--   1) الإغلاق الهرمي: أي مجموعة قدرات تُغلَق (system ⊃ finance ⊃ capture) حتى
--      يبقى ظِلّ enum مطابقًا للقدرات دائمًا (لا تناقض بين الواجهة والخلفية).
--   2) الأدوار الأربعة النظامية مرجعية غير قابلة للتعديل/الحذف (تفادي قفل النفس).
-- ولمنع تجاوز هذه الثوابت عبر REST المباشر، تُسحَب سياسات الكتابة المباشرة.

-- ── سحب الكتابة المباشرة (تبقى القراءة) ──
drop policy if exists "write_roles_system"              on roles;
drop policy if exists "update_roles_system"             on roles;
drop policy if exists "delete_roles_system"             on roles;
drop policy if exists "write_role_capabilities_system"  on role_capabilities;
drop policy if exists "delete_role_capabilities_system" on role_capabilities;

-- ── إغلاق مجموعة القدرات هرميًا ──
create or replace function close_capabilities(p_caps text[]) returns text[]
language sql immutable set search_path = public as $$
  select case
    when 'manage_system'     = any(p_caps) then array['manage_system','manage_finance','capture_documents']
    when 'manage_finance'    = any(p_caps) then array['manage_finance','capture_documents']
    when 'capture_documents' = any(p_caps) then array['capture_documents']
    else array[]::text[]
  end;
$$;

-- ── إنشاء/تعديل دور مخصّص (p_role_id فارغ = إنشاء) ──
create or replace function save_role(p_name text, p_capabilities text[], p_role_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_role_id uuid;
  v_caps    text[];
begin
  if not has_capability(auth.uid(), 'manage_system') then
    raise exception 'لا صلاحية لإدارة الأدوار' using errcode = '42501';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'اسم الدور مطلوب';
  end if;

  v_caps := close_capabilities(p_capabilities);

  if p_role_id is null then
    insert into roles (name_ar, is_system) values (p_name, false) returning id into v_role_id;
  else
    if exists (select 1 from roles where id = p_role_id and is_system) then
      raise exception 'الأدوار النظامية غير قابلة للتعديل' using errcode = '42501';
    end if;
    update roles set name_ar = p_name where id = p_role_id and not is_system;
    if not found then raise exception 'الدور غير موجود'; end if;
    v_role_id := p_role_id;
    delete from role_capabilities where role_id = v_role_id;
  end if;

  if array_length(v_caps, 1) is not null then
    insert into role_capabilities (role_id, capability_code) select v_role_id, unnest(v_caps);
  end if;

  -- تحديث ظِلّ enum لكل حاملي هذا الدور (قدراته تغيّرت) عبر محفّز المزامنة.
  update profiles set role_id = v_role_id where role_id = v_role_id;

  return v_role_id;
end; $$;

-- ── حذف دور مخصّص (بشرط ألا يكون نظاميًا ولا مستخدَمًا) ──
create or replace function delete_role(p_role_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_capability(auth.uid(), 'manage_system') then
    raise exception 'لا صلاحية لإدارة الأدوار' using errcode = '42501';
  end if;
  if exists (select 1 from roles where id = p_role_id and is_system) then
    raise exception 'الأدوار النظامية لا تُحذف' using errcode = '42501';
  end if;
  if exists (select 1 from profiles where role_id = p_role_id) then
    raise exception 'الدور مُسنَد لمستخدمين — أعِد تعيينهم أولًا' using errcode = '42501';
  end if;
  delete from roles where id = p_role_id and not is_system;
end; $$;

-- ── تعيين دور لمستخدم (لا يشمل الذات: تفادي قفل النفس) ──
create or replace function assign_user_role(p_user uuid, p_role_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_capability(auth.uid(), 'manage_system') then
    raise exception 'لا صلاحية لتعيين الأدوار' using errcode = '42501';
  end if;
  if p_user = auth.uid() then
    raise exception 'لا يمكنك تغيير دور نفسك' using errcode = '42501';
  end if;
  if not exists (select 1 from roles where id = p_role_id) then
    raise exception 'الدور غير موجود';
  end if;
  update profiles set role_id = p_role_id where id = p_user;
  if not found then raise exception 'المستخدم غير موجود'; end if;
end; $$;

-- ── منح/سحب التنفيذ (فخّ السحاب: سحب صريح من anon) ──
revoke execute on function close_capabilities(text[])       from public, anon;
grant  execute on function close_capabilities(text[])       to authenticated;
revoke execute on function save_role(text, text[], uuid)    from public, anon;
grant  execute on function save_role(text, text[], uuid)    to authenticated;
revoke execute on function delete_role(uuid)                from public, anon;
grant  execute on function delete_role(uuid)                to authenticated;
revoke execute on function assign_user_role(uuid, uuid)     from public, anon;
grant  execute on function assign_user_role(uuid, uuid)     to authenticated;
