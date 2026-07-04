-- حساب المشتريات (الطرف المدين المقابل لدَين الفاتورة).
insert into accounts (code, name_ar, balance) values
  ('purchases', 'المشتريات', 0)
on conflict (code) do nothing;

-- ── محفّز دَين الفاتورة ──
-- إنشاء فاتورة (أو مزامنة فاتورة ملتقَطة دون اتصال) يُرحّل دَينها تلقائيًا لحظة
-- وصول الصف للقاعدة (متّصلًا دائمًا) — يوفّق بين "الالتقاط دون اتصال" و"المالية
-- متّصلة إلزامًا": الوثيقة تُلتقَط دون اتصال، والقيد المالي يُرحَّل عند المزامنة.
--   INSERT: يُرحّل المتبقّي (amount − paid) دَينًا.
--   UPDATE (تعديل المبلغ): يُرحّل فرق المبلغ.
--   UPDATE (حذف ناعم): يعكس المتبقّي.
--   تغيّر paid وحده (محرّك السداد) → يُتجاهَل (السداد يخصم رصيد المورد بنفسه).
-- SECURITY DEFINER ليتجاوز محفّز الحماية على الأعمدة المالية (سياق postgres).
create or replace function book_invoice_debt()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_delta   numeric(14,2);
  v_txn     uuid;
  v_pay_acc uuid;
  v_pur_acc uuid;
  v_sup     uuid := coalesce(new.supplier_id, old.supplier_id);
  v_note    text;
begin
  if tg_op = 'INSERT' then
    v_delta := new.amount - coalesce(new.paid, 0);
    v_note  := 'دَين فاتورة ' || new.paper_no;
  elsif tg_op = 'UPDATE' then
    if new.is_deleted and not old.is_deleted then
      v_delta := -(old.amount - coalesce(old.paid, 0));
      v_note  := 'إلغاء فاتورة ' || old.paper_no;
    elsif new.amount is distinct from old.amount and new.is_deleted = old.is_deleted then
      v_delta := new.amount - old.amount;
      v_note  := 'تعديل فاتورة ' || new.paper_no;
    else
      return new;  -- تغيّر paid وحده أو غيره → لا أثر على الدَين
    end if;
  else
    return new;
  end if;

  if v_delta = 0 then return new; end if;

  select id into v_pay_acc from accounts where code = 'suppliers_payable';
  select id into v_pur_acc from accounts where code = 'purchases';

  insert into transactions(type, total, user_id, note, supplier_id)
  values ('purchase', abs(v_delta), coalesce(new.created_by, old.created_by), v_note, v_sup)
  returning id into v_txn;

  -- دَين (delta>0): مدين مشتريات، دائن ذمم موردين. إلغاء/تخفيض (delta<0): العكس.
  if v_delta > 0 then
    insert into ledger_entries(transaction_id, account_id, debit)  values (v_txn, v_pur_acc, v_delta);
    insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_pay_acc, v_delta);
  else
    insert into ledger_entries(transaction_id, account_id, credit) values (v_txn, v_pur_acc, -v_delta);
    insert into ledger_entries(transaction_id, account_id, debit)  values (v_txn, v_pay_acc, -v_delta);
  end if;

  update accounts  set balance = balance + v_delta where id = v_pur_acc;  -- مشتريات: مدينة
  update accounts  set balance = balance + v_delta where id = v_pay_acc;  -- ذمم موردين: دائنة
  update suppliers set balance = balance + v_delta where id = v_sup;

  return new;
end; $$;

create trigger trg_invoice_debt_ins after insert on invoices
  for each row execute function book_invoice_debt();

create trigger trg_invoice_debt_upd after update on invoices
  for each row execute function book_invoice_debt();
