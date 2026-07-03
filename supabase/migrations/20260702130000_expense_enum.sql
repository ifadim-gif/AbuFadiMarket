-- حساب المصروفات التشغيلية للمرحلة 4ج (طبيعة مدينة، مقابل الإيرادات).
-- في ترحيل منفصل لأن ALTER TYPE ADD VALUE لا تُستخدم قيمتها في نفس المعاملة.
alter type account_type add value 'operating_expense';
