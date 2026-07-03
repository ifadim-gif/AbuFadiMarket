import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '../../types/domain'

export interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
