-- الأرصدة الافتتاحية: حساب حقوق ملكية افتتاحية (الطرف المقابل المتوازن) + نوع
-- حركة مخصَّص. في ترحيل منفصل (ALTER TYPE ADD VALUE لا تُستخدم في نفس المعاملة).
alter type account_type add value 'opening_equity';
alter type txn_type add value 'opening_balance';
