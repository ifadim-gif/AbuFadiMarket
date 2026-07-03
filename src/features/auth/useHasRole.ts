import { useAuth } from './useAuth'
import type { UserRole } from '../../types/domain'

/**
 * UI-only gate: hides screens/buttons from roles that shouldn't see them.
 * This is NOT the real security boundary — RLS policies and the RPC
 * functions' own role checks are what actually enforce access server-side.
 */
export function useHasRole(allow: UserRole[]) {
  const { profile } = useAuth()
  return !!profile && allow.includes(profile.role)
}
