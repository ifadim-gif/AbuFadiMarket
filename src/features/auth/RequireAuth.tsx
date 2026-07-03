import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <LoadingSpinner label="جارٍ التحقق من الجلسة..." />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}
