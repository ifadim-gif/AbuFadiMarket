import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GlassCard } from '../../components/ui/GlassCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useHasRole } from '../auth/useHasRole'
import { useChecks } from './hooks'
import { statusBadgeVariant, statusLabels } from './statusLabels'
import type { CheckStatus } from '../../types/domain'

const statusOptions: (CheckStatus | 'all')[] = ['all', 'available', 'endorsed', 'cashed', 'bounced']

export function ChecksListPage() {
  const [statusFilter, setStatusFilter] = useState<CheckStatus | 'all'>('all')
  const { data: checks, isLoading, error } = useChecks(
    statusFilter === 'all' ? undefined : statusFilter,
  )
  const canManage = useHasRole(['admin', 'super_admin'])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">الشيكات</h1>
        {canManage && (
          <Link to="/checks/new">
            <Button>شيك جديد</Button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {statusOptions.map((opt) => (
          <button
            key={opt}
            onClick={() => setStatusFilter(opt)}
            className={`rounded-full border px-3 py-1 text-xs ${
              statusFilter === opt
                ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                : 'border-glass-border text-gray-400 hover:bg-white/5'
            }`}
          >
            {opt === 'all' ? 'الكل' : statusLabels[opt]}
          </button>
        ))}
      </div>

      {isLoading && <LoadingSpinner label="جارٍ تحميل الشيكات..." />}
      {error && <ErrorBanner message="تعذّر تحميل الشيكات" />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {checks?.map((c) => (
          <Link key={c.id} to={`/checks/${c.id}`}>
            <GlassCard className="h-full transition-colors hover:border-indigo-400/40">
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-white">{c.amount.toFixed(2)}</span>
                <Badge variant={statusBadgeVariant[c.status]}>{statusLabels[c.status]}</Badge>
              </div>
              {c.drawer_name && <p className="mt-1 text-sm text-gray-400">{c.drawer_name}</p>}
              {c.due_date && <p className="mt-1 text-xs text-gray-500">استحقاق {c.due_date}</p>}
            </GlassCard>
          </Link>
        ))}
      </div>

      {checks && checks.length === 0 && (
        <p className="text-sm text-gray-400">لا توجد شيكات بهذه الحالة.</p>
      )}
    </div>
  )
}
