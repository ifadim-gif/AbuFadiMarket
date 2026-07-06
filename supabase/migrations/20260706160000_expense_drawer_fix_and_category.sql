-- ═══ إصلاح المصروف من نقد الدرج + تخزين تصنيف المصروف ═══
--
-- 1) علّة حيّة: record_expense كان يرفض المصروف حين يتجاوز رصيد المصدر. هذا صحيح
--    لـ accumulated_cash (مُتتبَّع بدقّة) لكنه خاطئ لـ cash_drawer: مبيعات اليوم
--    النقدية غير مسجَّلة فرصيد الدرج بالدفتر ≈ الافتتاحية فقط، فيفشل أي مصروف نقدي
--    من الدرج. الحل: الفحص يبقى لـ accumulated_cash فقط؛ الدرج قد يصبح سالبًا
--    مؤقتًا ويُصحَّح عند الإغلاق اليومي (مطابقة لترخيص skim_drawer/pay_supplier).
-- 2) تخزين p_category_id (تصنيف المصروف) على صف الحركة — بلا أثر على القيد.
--
-- record_expense مُغلَّفة (impl + wrapper يفرض auth.uid). تغيّر التوقيع يستلزم إسقاط
-- النسختين القديمتين وإنشاء نسختين بالتوقيع الجديد (لتفادي التباس دقّة الاستدعاء).

drop function if exists record_expense(numeric, text, uuid, text);
drop function if exists record_expense_impl(numeric, text, uuid, text);

create function record_expense_impl(
  p_amount      numeric,
  p_source      text,
  p_actor       uuid,
  p_note        text default null,
  p_category_id uuid default null
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
  if p_category_id is not null
     and not exists (select 1 from categories where id = p_category_id and kind = 'expense') then
    raise exception 'تصنيف المصروف غير صالح';
  end if;

  select id, balance into v_src_acc, v_src_bal
  from accounts where code = p_source::account_type for update;

  -- الفحص لـ accumulated_cash فقط؛ الدرج يُسمح بتجاوزه (يُصحَّح عند الإغلاق).
  if p_source = 'accumulated_cash' and p_amount > v_src_bal then
    raise exception 'المبلغ (%) يتجاوز رصيد المصدر (%)', p_amount, v_src_bal;
  end if;

  select id into v_exp_acc from accounts where code = 'operating_expense';

  insert into transactions(type, total, user_id, note, category_id)
  values ('expense', p_amount, p_actor, coalesce(p_note, 'مصروف نقدي'), p_category_id)
  returning id into v_txn;

  -- مدين المصروفات (طبيعة مدينة: يزيد)، دائن المصدر (أصل: ينقص).
  insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_exp_acc, p_amount);
  update accounts set balance = balance + p_amount where id = v_exp_acc;

  insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_src_acc, p_amount);
  update accounts set balance = balance - p_amount where id = v_src_acc;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor, 'record_expense', 'account', v_src_acc,
          jsonb_build_object('amount', p_amount, 'source', p_source, 'txn', v_txn, 'category', p_category_id));

  return v_txn;
end; $$;

revoke execute on function record_expense_impl(numeric, text, uuid, text, uuid) from public, anon, authenticated;

-- غلاف ربط الهوية بنفس نمط بقية الدوال (p_actor = auth.uid).
create function record_expense(
  p_amount      numeric,
  p_source      text,
  p_actor       uuid,
  p_note        text default null,
  p_category_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_actor is distinct from auth.uid() then
    raise exception 'ليس لديك صلاحية لتنفيذ هذه العملية' using errcode = '42501';
  end if;
  return record_expense_impl(p_amount, p_source, p_actor, p_note, p_category_id);
end; $$;

revoke execute on function record_expense(numeric, text, uuid, text, uuid) from public, anon;
grant  execute on function record_expense(numeric, text, uuid, text, uuid) to authenticated;
