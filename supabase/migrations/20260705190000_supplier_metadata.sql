-- المرحلة 3: بيانات وصفية إضافية للموردين (لا تلمس أي عمود مالي محمي).
--
-- 1) رقم تعريف مقروء للمورد (supplier_no) لا يُستبدل UUID، فقط عرض بشري.
-- 2) نمط أيام الزيارة: أيام أسبوعية محددة (visit_days الموجود) / مرة بالشهر
--    (visit_day_of_month) / غير محدد — لتغذية صفحة "تجار اليوم".
-- 3) حظر الطلبية (orders_blocked) — علم إداري بسيط، غير مرتبط بالعلامة
--    الحمراء (تلك تبقى محمية بمحفّز السداد ومؤجَّلة لمرحلة الصلاحيات/RPC).
--
-- ملاحظة: "الطلبية بدون فاتورة" لا تُخزَّن كسجل تتبّعي منفصل — بل تُنشأ كفاتورة
-- حقيقية برقم تلقائي (NO-#####) فتُنشئ دَينًا فوريًا عبر محفّز book_invoice_debt
-- كأي فاتورة (انظر ترحيل order_invoice_numbering). هذا يوحّد المسار المالي ويمنع
-- أي مصدر دَين موازٍ.

alter table suppliers add column supplier_no serial unique;

create type visit_pattern_type as enum ('weekly', 'monthly', 'unspecified');

alter table suppliers
  add column visit_pattern visit_pattern_type not null default 'unspecified',
  add column visit_day_of_month smallint check (visit_day_of_month between 1 and 31),
  add column orders_blocked boolean not null default false;
