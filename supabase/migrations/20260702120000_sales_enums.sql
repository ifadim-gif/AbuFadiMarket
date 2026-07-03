-- إضافات enum للمرحلة 4ب (المبيعات والذمم). في ترحيل منفصل لأن ALTER TYPE
-- ADD VALUE لا يمكن استخدام قيمتها في نفس المعاملة.
alter type account_type add value 'sales_revenue';   -- إيرادات المبيعات (طبيعة دائنة)

alter type txn_type add value 'sale';                 -- حركة بيع (يقابلها إيراد)
alter type txn_type add value 'receivable_settlement'; -- سداد ذمّة عميل

alter type check_status add value 'deposited';        -- شيك أُرسل للبنك بانتظار الصرف
