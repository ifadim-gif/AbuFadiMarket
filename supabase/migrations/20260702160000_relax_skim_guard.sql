-- إفراغ الدرج: إزالة قيد "المبلغ يتجاوز رصيد الدرج المسجَّل". المبيعات النقدية
-- لا تُسجَّل أثناء اليوم، فرصيد الدرج بالدفتر = الافتتاحية فقط بينما الدرج الفعلي
-- يحوي الافتتاحية + مبيعات اليوم. لذا يجب السماح بإفراغ نقد فعلي يتجاوز الرصيد
-- المسجَّل (يذهب للمتراكم)، ويُصحَّح الرصيد عند الإغلاق اليومي (المعدود مقابل
-- المتوقّع، فيُعترَف بالمبيعات إيرادًا). يبقى فحص المبلغ الموجب فقط.
-- نعيد كتابة الـimpl (المُغلَّف من محرّك ربط الهوية)؛ الغلاف والصلاحيات كما هي.
create or replace function skim_drawer_impl(p_amount numeric, p_actor uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_txn        uuid;
  v_drawer_acc uuid;
  v_accum_acc  uuid;
begin
  if not exists (
    select 1 from profiles where id = p_actor and role in ('admin', 'super_admin', 'cashier')
  ) then
    raise exception 'ليس لديك صلاحية لتنفيذ هذه العملية' using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'المبلغ غير صالح';
  end if;

  select id into v_drawer_acc from accounts where code = 'cash_drawer' for update;
  select id into v_accum_acc  from accounts where code = 'accumulated_cash';

  insert into transactions(type, total, user_id, note)
  values ('liquidity_transfer', p_amount, p_actor, 'إفراغ الدرج')
  returning id into v_txn;

  insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_drawer_acc, p_amount);
  update accounts set balance = balance - p_amount where id = v_drawer_acc;

  insert into ledger_entries(transaction_id, account_id, debit) values (v_txn, v_accum_acc, p_amount);
  update accounts set balance = balance + p_amount where id = v_accum_acc;

  insert into audit_log(actor, action, entity, entity_id, payload)
  values (p_actor, 'skim_drawer', 'account', v_drawer_acc, jsonb_build_object('amount', p_amount, 'txn', v_txn));

  return v_txn;
end; $$;
