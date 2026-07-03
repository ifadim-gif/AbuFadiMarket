-- منح صلاحيات الجدول الأساسية (GRANT) للأدوار anon/authenticated/service_role.
-- هذا منفصل عن سياسات RLS: الـ GRANT يفتح الباب على مستوى الجدول،
-- وRLS (المُفعَّلة في الملف السابق) تتحكّم بعد ذلك في الصفوف المرئية/القابلة للتعديل.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
