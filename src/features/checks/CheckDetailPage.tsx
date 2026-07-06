import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { GlassCard } from '../../components/ui/GlassCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { BackLink } from '../../components/ui/BackLink'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useAuth } from '../auth/useAuth'
import { useHasCapability } from '../auth/useHasCapability'
import { useBounceCheck } from '../payments/hooks'
import { useCheck } from './hooks'
import { CheckPhotoCapture } from './CheckPhotoCapture'
import { statusBadgeVariant, statusLabels } from './statusLabels'

export function CheckDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: check, isLoading, error } = useCheck(id!)
  const { session } = useAuth()
  const canBounce = useHasCapability('manage_finance')
  const canCapture = useHasCapability('capture_documents')
  const bounceCheck = useBounceCheck()
  const [bounceError, setBounceError] = useState<string | null>(null)

  if (isLoading) return <LoadingSpinner label="جارٍ تحميل الشيك..." />
  if (error || !check) return <ErrorBanner message="تعذّر تحميل بيانات الشيك" />

  async function handleBounce() {
    setBounceError(null)
    try {
      await bounceCheck.mutateAsync({ checkId: id!, actorId: session!.user.id })
    } catch {
      setBounceError('تعذّر تسجيل الشيك كراجع')
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <BackLink to="/checks" label="الشيكات" />
      <GlassCard>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-lg font-bold text-white">{check.amount.toFixed(2)}</h1>
          <Badge variant={statusBadgeVariant[check.status]}>{statusLabels[check.status]}</Badge>
        </div>
        {check.drawer_name && (
          <p className="mt-2 text-sm text-gray-300">صاحب الشيك: {check.drawer_name}</p>
        )}
        {check.customer_ref && (
          <p className="mt-1 text-sm text-gray-300">رقم حساب الزبون: {check.customer_ref}</p>
        )}
        {check.due_date && (
          <p className="mt-1 text-sm text-gray-400">تاريخ الاستحقاق: {check.due_date}</p>
        )}

        {canBounce && check.status === 'endorsed' && (
          <div className="mt-4 border-t border-glass-border pt-4">
            {bounceError && <ErrorBanner message={bounceError} />}
            <Button variant="danger" onClick={handleBounce} disabled={bounceCheck.isPending}>
              {bounceCheck.isPending ? 'جارٍ التنفيذ...' : 'تسجيل كشيك راجع'}
            </Button>
          </div>
        )}
      </GlassCard>

      {canCapture && (
        <GlassCard>
          <CheckPhotoCapture checkId={check.id} actorId={session!.user.id} canManage={canBounce} />
        </GlassCard>
      )}
    </div>
  )
}
