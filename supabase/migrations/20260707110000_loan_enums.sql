-- توسيع الـenums للقروض البنكية. (ALTER TYPE ADD VALUE لا يُستخدَم في نفس معاملة
-- استخدامه، لذا في ترحيل منفصل عن محرّك القروض.)
alter type account_type add value 'loans_payable';   -- حاوية التزام: قروض بنكية
alter type txn_type add value 'loan_received';        -- استلام قرض (يدخل البنك)
alter type txn_type add value 'loan_payment';         -- سداد قسط قرض (يخرج من مصدر)
