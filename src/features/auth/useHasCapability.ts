import { useAuth } from './useAuth'
import { capabilitiesForRole, type Capability } from './capabilities'

/**
 * بوابة الواجهة القائمة على القدرات (تخفي شاشات/أزرارًا). ليست حدّ الأمان الفعلي —
 * RLS ودوال RPC هي ما يفرض الوصول في الخادم. تُشتقّ من ظِلّ enum الهرمي فتطابق
 * الخلفية تمامًا حتى للأدوار المخصّصة.
 */
export function useHasCapability(cap: Capability) {
  const { profile } = useAuth()
  return !!profile && capabilitiesForRole(profile.role).includes(cap)
}
