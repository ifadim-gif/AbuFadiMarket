-- نموذج دَين الفاتورة: الفاتورة = شراء آجل يُنشئ دَينًا للمورد. الطرف المدين
-- المقابل هو حساب "مشتريات" (تكلفة البضاعة). enum منفصل (ALTER TYPE ADD VALUE).
alter type account_type add value 'purchases';
alter type txn_type add value 'purchase';
