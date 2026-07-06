-- ═══ أساس المجموعات/التصنيفات (للموردين والمصروفات) — إضافي غير مالي ═══
--
-- يُعاد استخدام جدول categories الموجود ببُعدين عبر عمود kind:
--   'supplier' = مجموعة منتجات المورد (مواد نظافة، سجائر، ألبان...)
--   'expense'  = تصنيف المصروف (منزل، ضرائب، أجور، قرطاسية...)
-- يربط suppliers.category_id (مجموعة المورد) و transactions.category_id (تصنيف
-- المصروف). لا أثر مالي — أعمدة تصنيف اختيارية للعرض والتقارير فقط.

alter table categories
  add column kind text not null default 'supplier' check (kind in ('supplier', 'expense'));

-- الاسم فريد ضمن النوع الواحد فقط (يجوز تكرار الاسم بين مورد ومصروف).
alter table categories drop constraint categories_name_key;
alter table categories add constraint categories_name_kind_key unique (name, kind);

-- الصفوف التجريبية القائمة (مواد غذائية، مشروبات، صيانة) تبقى مجموعات موردين.

alter table suppliers    add column category_id uuid references categories(id);
alter table transactions add column category_id uuid references categories(id);
