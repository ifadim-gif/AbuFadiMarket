-- إغلاق ثغرة تجاوز محرّك السداد: جداول accounts/suppliers/checks تملك سياسات
-- UPDATE مباشرة للإدارة عبر REST، مما يسمح بتغيير الأرصدة/الحالات المالية دون
-- المرور بدفتر القيد المزدوج — يكسر قانون حفظ الطاقة (القسم 4) بصمت.
--
-- الحل: محفّز BEFORE UPDATE يرفض تغيير الأعمدة المالية الحسّاسة إلا حين يكون
-- المنفِّذ هو مالك الدوال (postgres) — أي من داخل دوال RPC بصلاحية
-- security definer فقط. بقية الأعمدة (الاسم، الهاتف، أيام الزيارة، مؤشر
-- المخاطر...) تبقى قابلة للتعديل المباشر للإدارة كما هي.
--
-- ملاحظة: داخل دالة security definer المملوكة لـ postgres يصبح current_user
-- = 'postgres'، بينما تعديلات PostgREST المباشرة تعمل كـ authenticated/anon.

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
  end if;

  return new;
end; $$;

create trigger guard_accounts_financial
  before update on accounts
  for each row execute function guard_engine_only_update();

create trigger guard_suppliers_financial
  before update on suppliers
  for each row execute function guard_engine_only_update();

create trigger guard_checks_financial
  before update on checks
  for each row execute function guard_engine_only_update();
