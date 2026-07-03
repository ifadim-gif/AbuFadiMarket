import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { useHasRole } from './useHasRole'
import type { UserRole } from '../../types/domain'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

export function RequireRole({
  allow,
  children,
}: {
  allow: UserRole[]
  children: ReactNode
}) {
  const { isLoading } = useAuth()
  const hasRole = useHasRole(allow)

  if (isLoading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <LoadingSpinner label="جارٍ التحقق من الصلاحية..." />
      </div>
    )
  }
  if (!hasRole) return <Navigate to="/" replace />
  return children
}
