import type { Supplier } from '../../types/domain'

export const dayLabels = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export const visitPatternLabels: Record<Supplier['visit_pattern'], string> = {
  weekly: 'أيام أسبوعية محددة',
  monthly: 'مرة بالشهر',
  unspecified: 'غير محدد',
}

export function isSupplierDueOn(supplier: Supplier, date: Date): boolean {
  if (supplier.visit_pattern === 'weekly') {
    return (supplier.visit_days ?? []).includes(date.getDay())
  }
  if (supplier.visit_pattern === 'monthly') {
    return supplier.visit_day_of_month === date.getDate()
  }
  return false
}
