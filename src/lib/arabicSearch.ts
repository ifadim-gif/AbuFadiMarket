/**
 * تطبيع نص عربي للبحث المتسامح: يوحّد أشكال الألف (أ/إ/آ) بألف عادية، والتاء
 * المربوطة بهاء، ويحذف التشكيل، ليتجاهل البحث فروقًا إملائية شائعة
 * (مثال: "أيمن" يُطابَق بالبحث عن "ايمن").
 */
export function normalizeArabic(text: string): string {
  return text
    // يجب أن يسبق NFKD: التفكيك يحوّل الهمزة المركّبة لعلامة منفصلة فتُفلت من هذا الاستبدال.
    .replace(/[أإآا]/g, 'ا') // أ/إ/آ/ا -> ا
    .replace(/ة/g, 'ه') // ة -> ه
    .normalize('NFKD')
    .replace(/[ً-ٰٟ]/g, '') // تشكيل + علامات الهمزة/المدّة المتبقية بعد التفكيك
    .toLowerCase()
    .trim()
}

export function arabicIncludes(haystack: string | null | undefined, query: string): boolean {
  if (!haystack) return false
  return normalizeArabic(haystack).includes(normalizeArabic(query))
}
