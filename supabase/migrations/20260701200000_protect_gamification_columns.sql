-- إغلاق ثغرة مماثلة لثغرة الأرصدة المالية: profiles.stardust/unlocked_planets
-- كانا قابلين للتعديل المباشر عبر REST (سياسة update_own_or_admin_profiles
-- لا تستثنيهما)، بينما المقصود أن التحفيز يُمنح فقط من داخل دوال RPC
-- (pay_supplier، close_daily_orbit) بنفس فلسفة guard_engine_only_update().

create or replace function guard_engine_only_update()
returns trigger language plpgsql as $$
begin
  if current_user = 'postgres' then
    return new; -- استُدعي من داخل محرّك RPC (security definer) — مسموح
  end if;

  if tg_table_name = 'accounts' then
    if new.balance is distinct from old.balance then
      raise exception 'رصيد الحساب لا يُعدَّل إلا عبر محرّك السداد' using errcode = '42501';
    end if;

  elsif tg_table_name = 'suppliers' then
    if new.balance   is distinct from old.balance
       or new.red_flag      is distinct from old.red_flag
       or new.red_flag_note is distinct from old.red_flag_note then
      raise exception 'رصيد/علامة المورد لا تُعدَّل إلا عبر محرّك السداد' using errcode = '42501';
    end if;

  elsif tg_table_name = 'checks' then
    if new.status      is distinct from old.status
       or new.endorsed_to is distinct from old.endorsed_to then
      raise exception 'حالة/تجيير الشيك لا تُعدَّل إلا عبر محرّك السداد' using errcode = '42501';
    end if;

  elsif tg_table_name = 'profiles' then
    if new.stardust is distinct from old.stardust
       or new.unlocked_planets is distinct from old.unlocked_planets then
      raise exception 'غبار النجوم والكواكب لا تُعدَّل إلا عبر محرّك التحفيز' using errcode = '42501';
    end if;
  end if;

  return new;
end; $$;

create trigger guard_profiles_gamification
  before update on profiles
  for each row execute function guard_engine_only_update();
