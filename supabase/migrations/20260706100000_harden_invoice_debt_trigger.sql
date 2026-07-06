-- تحصين دالة محفّز دَين الفاتورة.
--
-- book_invoice_debt() دالة `returns trigger` بصلاحية SECURITY DEFINER. المنح
-- الافتراضية على السحاب تجعلها قابلة للتنفيذ من anon/authenticated عبر
-- /rest/v1/rpc/book_invoice_debt (تشير إليها db advisors:
-- anon_security_definer_function_executable). الخطر الفعلي صفر — PostgreSQL يرفض
-- نداء دالة trigger مباشرة خارج سياق محفّز ("trigger functions can only be called
-- as triggers") — لكن كشفها يخالف عُرف المشروع (يجب أن يكون anon-executable صفرًا).
--
-- الحل: سحب EXECUTE صراحةً من public وanon وauthenticated. هذا لا يؤثّر إطلاقًا
-- على إطلاق المحفّز: المحفّزات تُنفَّذ بصلاحيات مالك الجدول (postgres) لا المستدعي،
-- فيبقى ترحيل الدَّين على الإدراج/التعديل يعمل كما هو.

revoke execute on function book_invoice_debt() from public, anon, authenticated;
