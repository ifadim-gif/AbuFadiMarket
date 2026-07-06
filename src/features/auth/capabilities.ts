import type { UserRole } from '../../types/domain'

export type Capability = 'capture_documents' | 'manage_finance' | 'manage_system'

export const capabilityLabels: Record<Capability, string> = {
  capture_documents: 'التقاط المستندات',
  manage_finance: 'الإدارة المالية',
  manage_system: 'إدارة النظام',
}

// ترتيب هرمي للعرض (الأدنى أولًا).
export const orderedCapabilities: Capability[] = [
  'capture_documents',
  'manage_finance',
  'manage_system',
]

/**
 * قدرات المستخدم تُشتقّ من ظِلّ enum (profiles.role) الهرمي الذي تحافظ عليه
 * القاعدة تلقائيًا — فيبقى تحقّق الواجهة مطابقًا لفرض RLS/RPC في الخلفية تمامًا،
 * حتى للأدوار المخصّصة (يأخذ كلٌّ منها ظِلًّا يعكس قدراته).
 */
export function capabilitiesForRole(role: UserRole): Capability[] {
  switch (role) {
    case 'super_admin':
      return ['capture_documents', 'manage_finance', 'manage_system']
    case 'admin':
      return ['capture_documents', 'manage_finance']
    case 'cashier':
      return ['capture_documents']
    default:
      return [] // monitor: قراءة فقط
  }
}
