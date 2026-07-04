-- سحب صريح لتنفيذ set_opening_balance عن anon (Supabase Cloud يمنح anon
-- تلقائيًا عبر default privileges، فلا يكفي revoke from public). الدالة محميّة
-- أصلًا بفحص super_admin داخليًا، وهذا تشديد دفاعي إضافي يُنظّف تقرير التدقيق.
revoke execute on function set_opening_balance(text, numeric) from anon;
