import { GlassCard } from '../../components/ui/GlassCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useDiscardOutboxItem, useOnlineStatus, useOutbox } from './hooks'
import type { OutboxStatus } from '../../lib/outbox'

const statusLabels: Record<OutboxStatus, string> = {
  pending: 'بالانتظار',
  synced: 'تمّت المزامنة',
  conflict: 'تعارض',
  error: 'خطأ',
}

const statusVariant: Record<OutboxStatus, 'ok' | 'warn' | 'danger' | 'neutral'> = {
  pending: 'warn',
  synced: 'ok',
  conflict: 'danger',
  error: 'danger',
}

export function OutboxPage() {
  const online = useOnlineStatus()
  const { data: items, isLoading } = useOutbox()
  const discard = useDiscardOutboxItem()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">صندوق الصادر (الالتقاط الميداني)</h1>
        <span className={online ? 'text-sm text-status-ok' : 'text-sm text-status-warn'}>
          {online ? 'متّصل — تُزامَن المسودّات تلقائيًا' : 'دون اتصال — ستُزامَن عند عودة الشبكة'}
        </span>
      </div>

      {isLoading && <LoadingSpinner label="جارٍ التحميل..." />}

      <div className="flex flex-col gap-2">
        {items?.map((item) => (
          <GlassCard key={item.id} className="flex items-center justify-between gap-3 p-4">
            <div className="text-sm">
              <span className="font-mono text-gray-200">{item.paper_no}</span>
              <span className="ms-2 text-gray-400">{item.amount.toFixed(2)}</span>
              {item.error && <p className="mt-1 text-xs text-status-danger">{item.error}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant[item.status]}>{statusLabels[item.status]}</Badge>
              {(item.status === 'conflict' || item.status === 'error' || item.status === 'synced') && (
                <Button variant="secondary" onClick={() => discard.mutate(item.id)}>
                  إزالة
                </Button>
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      {items && items.length === 0 && (
        <p className="text-sm text-gray-400">لا توجد عناصر في صندوق الصادر.</p>
      )}
    </div>
  )
}
