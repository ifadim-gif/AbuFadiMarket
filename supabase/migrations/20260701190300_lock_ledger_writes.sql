-- تشديد نهائي: بعد التحقق الكامل من دوال محرّك السداد (pay_supplier،
-- skim_drawer، bounce_check، reverse_transaction) وعملها بصلاحية
-- security definer (تتجاوز RLS تلقائيًا)، لم تعد هناك حاجة لسماح الإدارة
-- بالإدراج المباشر في transactions أو ledger_entries عبر REST API.
-- الكتابة تصبح حصرًا عبر الدوال الأربع، لمنع أي قيد غير متوازن ناتج عن
-- خطأ في العميل أو استدعاء مباشر للـ API.
drop policy "write_transactions_admin" on transactions;
drop policy "write_ledger_entries_admin" on ledger_entries;
-- لا سياسة إدراج بديلة عن قصد.
