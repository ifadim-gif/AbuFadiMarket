-- ╔═══ تشديد إضافي حرِج: سحب صريح لصلاحية التنفيذ عن anon/authenticated ═══╗
-- على Supabase Cloud تُمنح دوال schema public تلقائيًا لـ anon وauthenticated
-- عبر default privileges صريحة، فلا يكفي `revoke ... from public` (الذي عمل
-- محليًا فقط). النتيجة على السحاب: anon يستطيع استدعاء دوال _impl مباشرةً
-- (التي لا تحمل حارس auth.uid())، متجاوزًا الغلاف — ثغرة انتحال فعلية.
--
-- الإصلاح: سحب صريح من anon على كل الأغلفة (مع إبقاء authenticated)، وسحب
-- صريح من anon وauthenticated على كل _impl (داخلية فقط، المالك postgres يبقى
-- قادرًا على تنفيذها من داخل الغلاف). نستخدم regprocedure لتوقيع دقيق تلقائي.

do $$
declare
  names text[] := array[
    'pay_supplier','skim_drawer','bounce_check','reverse_transaction','close_daily_orbit',
    'create_check','record_daily_sales','deposit_check','clear_check','collect_card_clearing',
    'settle_receivable_transfer','record_expense'];
  n text;
  r record;
begin
  foreach n in array names loop
    -- الغلاف: سحب anon فقط (authenticated يبقى ليعمل التطبيق)
    for r in select p.oid::regprocedure as sig from pg_proc p
             join pg_namespace ns on ns.oid = p.pronamespace
             where p.proname = n and ns.nspname = 'public' loop
      execute format('revoke execute on function %s from anon', r.sig);
    end loop;
    -- الـimpl: سحب anon وauthenticated (داخلية بحتة)
    for r in select p.oid::regprocedure as sig from pg_proc p
             join pg_namespace ns on ns.oid = p.pronamespace
             where p.proname = n || '_impl' and ns.nspname = 'public' loop
      execute format('revoke execute on function %s from anon, authenticated', r.sig);
    end loop;
  end loop;

  -- is_admin: سحب anon (authenticated يبقى لسياسات RLS)
  for r in select p.oid::regprocedure as sig from pg_proc p
           join pg_namespace ns on ns.oid = p.pronamespace
           where p.proname = 'is_admin' and ns.nspname = 'public' loop
    execute format('revoke execute on function %s from anon', r.sig);
  end loop;
end $$;
