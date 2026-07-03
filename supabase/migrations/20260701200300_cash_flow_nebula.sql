-- سديم التدفق النقدي: إسقاط السيولة المتوقّعة للأيام القادمة.
-- دالة قراءة فقط (security invoker الافتراضي — الجداول المقروءة أصلًا
-- مسموح قراءتها لكل مصادَق عبر RLS، فلا حاجة لصلاحيات مرتفعة).
--
-- الالتزامات = دَين كل مورد (موزَّع على أقرب يوم زيارة متوقّع ضمن الأفق
-- فقط، تفاديًا لعدّه أكثر من مرّة) + الالتزامات المتوقّعة المُدخَلة يدويًا
-- (شيكات صادرة من بنك المحل، ضريبة، تأمين...) غير المسدَّدة بعد.
create or replace function project_cash_flow(p_horizon_days int default 30)
returns table (
  day date,
  supplier_obligation numeric(14,2),
  other_obligation numeric(14,2),
  projected_liquidity numeric(14,2),
  is_black_hole boolean
)
language sql stable set search_path = public as $$
  with liquid as (
    select coalesce(sum(balance), 0) as total
    from accounts where code in ('cash_drawer', 'accumulated_cash', 'bank', 'checks_on_hand')
  ),
  days as (
    select generate_series(current_date, current_date + (p_horizon_days - 1), interval '1 day')::date as day
  ),
  supplier_next_visit as (
    select s.id as supplier_id, s.balance, min(d.day) as visit_day
    from suppliers s
    join days d on extract(dow from d.day)::int = any(s.visit_days)
    where s.balance > 0
    group by s.id, s.balance
  ),
  supplier_obligations_by_day as (
    select visit_day as day, sum(balance) as amount
    from supplier_next_visit
    group by visit_day
  ),
  obligations_by_day as (
    select expected_date as day, sum(amount) as amount
    from expected_obligations
    where is_settled = false
      and expected_date between current_date and current_date + (p_horizon_days - 1)
    group by expected_date
  ),
  daily as (
    select
      d.day,
      coalesce(so.amount, 0) as supplier_obligation,
      coalesce(oo.amount, 0) as other_obligation
    from days d
    left join supplier_obligations_by_day so on so.day = d.day
    left join obligations_by_day oo on oo.day = d.day
  )
  select
    daily.day,
    daily.supplier_obligation,
    daily.other_obligation,
    (select total from liquid) - sum(daily.supplier_obligation + daily.other_obligation)
      over (order by daily.day rows between unbounded preceding and current row) as projected_liquidity,
    ((select total from liquid) - sum(daily.supplier_obligation + daily.other_obligation)
      over (order by daily.day rows between unbounded preceding and current row)) < 0 as is_black_hole
  from daily
  order by daily.day;
$$;

grant execute on function project_cash_flow(int) to anon, authenticated, service_role;
