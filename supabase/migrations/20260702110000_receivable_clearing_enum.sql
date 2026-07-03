-- توسيع account_type بمحفظتين جديدتين للمرحلة 4أ:
--   customer_receivable (ذمم العملاء) — أصل يزيد عند تسجيل دَين على عميل
--     (بدءًا من الشيك الراجع) وينقص عند تحصيله.
--   card_clearing (بطاقات قيد التحصيل) — أصل؛ حاوية تُنشأ الآن برصيد صفر،
--     وعملياتها المغذّية تأتي في المرحلة 4ب.
-- ملاحظة PostgreSQL: ALTER TYPE ... ADD VALUE لا يمكن استخدامها في نفس
-- المعاملة التي تستعمل القيمة الجديدة — لذلك في ترحيل منفصل عن الإدراج.
alter type account_type add value 'customer_receivable';
alter type account_type add value 'card_clearing';
