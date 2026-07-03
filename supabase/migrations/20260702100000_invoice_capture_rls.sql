-- المرحلة 3: إتاحة التقاط الفواتير للكاشير (ميدانيًا، دون اتصال ثم مزامنة).
--
-- قرار أمني مدروس: تخفيف سياسة INSERT على invoices فقط لتشمل الكاشير، مع
-- الإبقاء الصارم على أن التعديل والحذف للإدارة وحدها (update/delete_invoices_admin
-- بلا تغيير). مبرّر السلامة: إنشاء فاتورة لا يلمس أي عمود مالي إطلاقًا —
-- accounts.balance / suppliers.balance / ledger_entries كلها محميّة بمحفّز
-- guard_engine_only_update() على مستوى postgres فقط، ومحرّك السداد يبقى
-- محصورًا بالإدارة ومتّصلًا إلزاميًا. أقصى أثر للكاشير: إنشاء وثيقة فاتورة
-- قابلة للتدقيق عبر created_by (تُفرَض = auth.uid())، وقيد unique(supplier_id,
-- paper_no) يبقى فيصلًا صارمًا للتكرار. سلامة دفتر القيد محفوظة بالكامل.

drop policy "write_invoices_admin" on invoices;

create policy "write_invoices_capture" on invoices for insert with check (
  created_by = auth.uid()
  and exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role in ('admin', 'super_admin', 'cashier')
  )
);
