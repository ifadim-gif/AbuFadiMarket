-- ╔═══ إصلاح أمني حرِج: ربط المنفِّذ بالهوية المُصادَقة (منع انتحال الهوية) ═══╗
-- كشفت أداة Supabase Advisors أن كل دوال RPC المالية تثق بمعامل p_actor الذي
-- يُرسله المستدعي، دون التحقق أنه هويته الحقيقية (auth.uid()). أثره: أي مستخدم
-- (بل حتى anon) يمرّر UUID مديرٍ حقيقي فتُنفَّذ العملية بصلاحيته.
--
-- الحل بنمط الغلاف (بلا لمس أي جسم دالة مالية — صفر مخاطر نسخ):
--   1) إعادة تسمية كل دالة إلى <name>_impl (يبقى الجسم كما هو تمامًا).
--   2) سحب صلاحية التنفيذ عن العموم (تُستدعى داخليًا فقط عبر الغلاف).
--   3) غلاف بنفس الاسم/التوقيع يفرض p_actor = auth.uid() ثم يستدعي _impl.
-- الغلاف SECURITY DEFINER مملوك لـ postgres، فيقرأ auth.uid() من JWT الطلب،
-- ويستطيع استدعاء _impl (المالك دائمًا يملك التنفيذ). anon يُسحب منه التنفيذ.

do $$
declare
  v_sig text;
  v_types text;
  r record;
  sigs text[][] := array[
    -- name, arg-types (for rename/revoke), full-signature-with-defaults, call-args
    array['pay_supplier',
          'uuid, numeric, numeric, uuid[], uuid',
          'p_supplier uuid, p_cash numeric, p_drawer numeric, p_check_ids uuid[], p_actor uuid',
          'p_supplier, p_cash, p_drawer, p_check_ids, p_actor'],
    array['skim_drawer',
          'numeric, uuid',
          'p_amount numeric, p_actor uuid',
          'p_amount, p_actor'],
    array['bounce_check',
          'uuid, uuid',
          'p_check_id uuid, p_actor uuid',
          'p_check_id, p_actor'],
    array['reverse_transaction',
          'uuid, uuid',
          'p_transaction_id uuid, p_actor uuid',
          'p_transaction_id, p_actor'],
    array['close_daily_orbit',
          'numeric, uuid, date, numeric',
          'p_counted numeric, p_actor uuid, p_work_date date default current_date, p_new_float numeric default null',
          'p_counted, p_actor, p_work_date, p_new_float'],
    array['create_check',
          'numeric, text, uuid, date, text, text',
          'p_amount numeric, p_purpose text, p_actor uuid, p_due_date date default null, p_drawer_name text default null, p_customer_ref text default null',
          'p_amount, p_purpose, p_actor, p_due_date, p_drawer_name, p_customer_ref'],
    array['record_daily_sales',
          'date, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, uuid',
          'p_work_date date, p_cash_sales numeric, p_card_sales numeric, p_check_sales numeric, p_credit_invoice numeric, p_credit_delivery numeric, p_recv_cash numeric, p_recv_check numeric, p_recv_card numeric, p_actor uuid',
          'p_work_date, p_cash_sales, p_card_sales, p_check_sales, p_credit_invoice, p_credit_delivery, p_recv_cash, p_recv_check, p_recv_card, p_actor'],
    array['deposit_check',
          'uuid, uuid',
          'p_check_id uuid, p_actor uuid',
          'p_check_id, p_actor'],
    array['clear_check',
          'uuid, uuid',
          'p_check_id uuid, p_actor uuid',
          'p_check_id, p_actor'],
    array['collect_card_clearing',
          'numeric, uuid',
          'p_amount numeric, p_actor uuid',
          'p_amount, p_actor'],
    array['settle_receivable_transfer',
          'numeric, uuid',
          'p_amount numeric, p_actor uuid',
          'p_amount, p_actor'],
    array['record_expense',
          'numeric, text, uuid, text',
          'p_amount numeric, p_source text, p_actor uuid, p_note text default null',
          'p_amount, p_source, p_actor, p_note']
  ];
  i int;
begin
  for i in 1 .. array_length(sigs, 1) loop
    -- 1) rename original → _impl
    execute format('alter function %I(%s) rename to %I',
                   sigs[i][1], sigs[i][2], sigs[i][1] || '_impl');
    -- 2) lock impl away from all external roles (owner postgres retains execute)
    execute format('revoke execute on function %I(%s) from public',
                   sigs[i][1] || '_impl', sigs[i][2]);
    -- 3) create thin auth-binding wrapper with the identical external signature
    execute format($f$
      create function %I(%s) returns uuid
      language plpgsql security definer set search_path = public as $body$
      begin
        if auth.uid() is null or p_actor is distinct from auth.uid() then
          raise exception 'ليس لديك صلاحية لتنفيذ هذه العملية' using errcode = '42501';
        end if;
        return %I(%s);
      end; $body$
    $f$, sigs[i][1], sigs[i][3], sigs[i][1] || '_impl', sigs[i][4]);
    -- 4) restrict wrapper to authenticated only (remove anon/public)
    execute format('revoke execute on function %I(%s) from public',
                   sigs[i][1], sigs[i][2]);
    execute format('grant execute on function %I(%s) to authenticated',
                   sigs[i][1], sigs[i][2]);
  end loop;
end $$;

-- is_admin: تُستخدم داخل سياسات RLS للمصادَقين؛ نُبقيها لهم ونمنعها عن anon/العموم.
revoke execute on function is_admin() from public;
grant execute on function is_admin() to authenticated;

-- تثبيت search_path لمحفّز الحماية (كشفته الأداة: function_search_path_mutable).
alter function guard_engine_only_update() set search_path = public;
