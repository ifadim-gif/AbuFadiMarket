import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { useHasCapability } from './useHasCapability'
import type { Capability } from './capabilities'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

export function RequireCapability({
  cap,
  children,
}: {
  cap: Capability
  children: ReactNode
}) {
  const { isLoading } = useAuth()
  const allowed = useHasCapability(cap)

  if (isLoading) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <LoadingSpinner label="جارٍ التحقق من الصلاحية..." />
      </div>
    )
  }
  if (!allowed) return <Navigate to="/" replace />
  return children
}
