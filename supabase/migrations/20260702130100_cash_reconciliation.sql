-- ╔═══ المرحلة 4ج: تسوية النقدي (الصندوق الثاني + الافتتاحية + المصروفات) ═══╗
-- المعدود هو الحقيقة: المدخل النقدي = المعدود − المتوقّع بالدفتر؛ منه تحصيل
-- الذمم النقدي يُنقص ذمم العملاء، والباقي إيراد مبيعات نقدية. المدير يحدّد
-- الافتتاحية الجديدة وكل ما فوقها ينتقل للمتراكم.

-- ── حساب المصروفات التشغيلية ──
insert into accounts (code, name_ar, balance) values
  ('operating_expense', 'مصروفات تشغيلية', 0)
on conflict (code) do nothing;

-- ── تمديد daily_closes بأعمدة التسوية الجديدة ──
alter table daily_closes add column new_float        numeric(14,2);
alter table daily_closes add column cash_revenue     numeric(14,2);
alter table daily_closes add column recv_cash_applied numeric(14,2);
alter table daily_closes add column report_cash_ref  numeric(14,2);
alter table daily_closes add column second_drawer    numeric(14,2);

-- ── record_expense: مصروف نقدي من الدرج أو المتراكم ──
create or replace function record_expense(
  p_amount numeric,
  p_source text,
  p_actor  uuid,
  p_note   text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_txn     uuid;
  v_exp_acc uuid;
  v_src_acc uuid;
  v_src_bal numeric(14,2);
begin
  if not exists (
    select 1 from profiles where id = p_actor and role in ('admin', 'super_admin', 'cashier')
  ) then
    raise exception 'ليس لديك صلاحية لتنفيذ هذه العملية' using errcode = '42501';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'مبلغ المصروف غير صالح';
  end if;
  if p_source not in ('cash_drawer', 'accumulated_cash') then
    raise exception 'مصدر المصروف غير صالح';
  end if;

  select id, balance into v_src_acc, v_src_bal
  from accounts where code = p_source::account_type for update;
  if p_amount > v_src_bal then
    raise exception 'المبلغ (%) يتجاوز رصيد المصدر (%)', p_amount, v_src_bal;
  end if;

  select id into v_exp_acc from accounts where code = 'operating_expense';

  insert into transactions(type, total, user_id, note)
  values ('expense', p_amount, p_actor, coalesce(p_note, 'مصروف نقدي'))
  returning id into v_txn;

  -- مدين المصروفات (طبيعة مدينة: يزيد)، دائن المصدر (أصل: ينقص).
  insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_exp_acc, p_amount);
  update accounts set balance = balance + p_amount where id = v_exp_acc;

  insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_src_acc, p_amount);
  update accounts set balance = balance - p_amount where id = v_src_acc;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor, 'record_expense', 'account', v_src_acc,
          jsonb_build_object('amount', p_amount, 'source', p_source, 'txn', v_txn));

  return v_txn;
end; $$;

-- ── close_daily_orbit: نموذج تسوية النقدي الكامل ──
drop function if exists close_daily_orbit(numeric, uuid, date);

create or replace function close_daily_orbit(
  p_counted   numeric,
  p_actor     uuid,
  p_work_date date default current_date,
  p_new_float numeric default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_close_id    uuid;
  v_close_date  date := coalesce(p_work_date, current_date);
  v_drawer_acc  uuid;
  v_accum_acc   uuid;
  v_recv_acc    uuid;
  v_rev_acc     uuid;
  v_L           numeric(14,2);   -- المتوقّع (رصيد الدرج بالدفتر)
  v_F           numeric(14,2);   -- الافتتاحية الجديدة
  v_R           numeric(14,2);   -- نقدي التقرير (مرجع، قد يكون null)
  v_Rc          numeric(14,2) := 0;  -- تحصيل ذمم نقدي
  v_intake      numeric(14,2);
  v_cash_rev    numeric(14,2);
  v_second      numeric(14,2);
  v_d_accum     numeric(14,2);
  v_d_drawer    numeric(14,2);
  v_txn         uuid;
  v_stardust    int := 0;
begin
  if not exists (
    select 1 from profiles where id = p_actor and role in ('admin', 'super_admin', 'cashier')
  ) then
    raise exception 'ليس لديك صلاحية لتنفيذ هذه العملية' using errcode = '42501';
  end if;

  if p_counted is null or p_counted < 0 then
    raise exception 'المبلغ المعدود غير صالح';
  end if;

  if exists (select 1 from daily_closes where close_date = v_close_date) then
    raise exception 'تم إغلاق هذا اليوم مسبقًا';
  end if;

  select id, balance into v_drawer_acc, v_L from accounts where code = 'cash_drawer' for update;
  select id into v_accum_acc from accounts where code = 'accumulated_cash';
  select id into v_recv_acc  from accounts where code = 'customer_receivable';
  select id into v_rev_acc   from accounts where code = 'sales_revenue';

  v_F := coalesce(p_new_float, v_L);
  if v_F < 0 then raise exception 'الافتتاحية الجديدة غير صالحة'; end if;

  -- قراءة تقرير يوم العمل إن وُجد (نقدي مرجعي + تحصيل ذمم نقدي).
  select cash_sales, recv_cash into v_R, v_Rc
  from daily_sales_reports where work_date = v_close_date;
  v_Rc := coalesce(v_Rc, 0);

  v_intake   := p_counted - v_L;
  v_cash_rev := v_intake - v_Rc;
  if v_R is not null then v_second := v_cash_rev - v_R; end if;

  v_d_accum  := p_counted - v_F;   -- صافي تغيّر المتراكم
  v_d_drawer := v_F - v_L;         -- صافي تغيّر الدرج

  -- تُنشأ حركة فقط إن وُجد أي أثر.
  if v_d_accum <> 0 or v_d_drawer <> 0 or v_cash_rev <> 0 or v_Rc <> 0 then
    insert into transactions(type, total, user_id, note)
    values ('sales_skim', abs(v_intake), p_actor, 'تسوية إغلاق النقد')
    returning id into v_txn;

    -- المتراكم (أصل): موجب = مدين.
    if v_d_accum <> 0 then
      if v_d_accum > 0 then
        insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_accum_acc, v_d_accum);
      else
        insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_accum_acc, -v_d_accum);
      end if;
      update accounts set balance = balance + v_d_accum where id = v_accum_acc;
    end if;

    -- الدرج (أصل): موجب = مدين.
    if v_d_drawer <> 0 then
      if v_d_drawer > 0 then
        insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_drawer_acc, v_d_drawer);
      else
        insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_drawer_acc, -v_d_drawer);
      end if;
      update accounts set balance = balance + v_d_drawer where id = v_drawer_acc;
    end if;

    -- ذمم العملاء (أصل): تنقص بمقدار تحصيل النقد → دائن.
    if v_Rc <> 0 then
      insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_recv_acc, v_Rc);
      update accounts set balance = balance - v_Rc where id = v_recv_acc;
    end if;

    -- إيراد المبيعات النقدية (إيراد: موجب = دائن).
    if v_cash_rev <> 0 then
      if v_cash_rev > 0 then
        insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_rev_acc, v_cash_rev);
      else
        insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_rev_acc, -v_cash_rev);
      end if;
      update accounts set balance = balance + v_cash_rev where id = v_rev_acc;
    end if;
  end if;

  -- غبار النجوم: مطابقة نظيفة للتقرير + خلوّ الموردين من العلامات الحمراء.
  if v_R is not null and abs(coalesce(v_second, 0)) <= 5.00 then
    v_stardust := v_stardust + 10;
  end if;
  if not exists (select 1 from suppliers where red_flag) then
    v_stardust := v_stardust + 20;
  end if;

  insert into daily_closes(
    close_date, expected_drawer, counted_drawer, transaction_id, stardust_awarded, closed_by,
    new_float, cash_revenue, recv_cash_applied, report_cash_ref, second_drawer)
  values (v_close_date, v_L, p_counted, v_txn, v_stardust, p_actor,
          v_F, v_cash_rev, v_Rc, v_R, v_second)
  returning id into v_close_id;

  if v_stardust > 0 then
    perform award_stardust(p_actor, v_stardust);
  end if;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor, 'close_daily_orbit', 'daily_close', v_close_id,
          jsonb_build_object('work_date', v_close_date, 'expected', v_L, 'counted', p_counted,
                             'new_float', v_F, 'intake', v_intake, 'cash_revenue', v_cash_rev,
                             'recv_cash', v_Rc, 'report_cash', v_R, 'second_drawer', v_second,
                             'stardust', v_stardust));

  return v_close_id;
end; $$;
