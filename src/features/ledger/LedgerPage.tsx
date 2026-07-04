import { useState } from 'react'
import { GlassCard } from '../../components/ui/GlassCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useAuth } from '../auth/useAuth'
import { useHasRole } from '../auth/useHasRole'
import { useReverseTransaction } from '../payments/hooks'
import { useLedgerBalance, useTransactions } from './hooks'

const typeLabels: Record<string, string> = {
  payment: 'سداد',
  expense: 'مصروف',
  sales_skim: 'إفراغ درج',
  liquidity_transfer: 'تحويل سيولة',
  reversal: 'تراجع/تصحيح',
  sale: 'بيع',
  receivable_settlement: 'تحصيل ذمّة',
  purchase: 'شراء (فاتورة)',
  opening_balance: 'رصيد افتتاحي',
}

export function LedgerPage() {
  const { data: transactions, isLoading, error } = useTransactions()
  const { data: balance } = useLedgerBalance()
  const { session } = useAuth()
  const canReverse = useHasRole(['admin', 'super_admin'])
  const reverseTransaction = useReverseTransaction()
  const [reverseError, setReverseError] = useState<string | null>(null)

  const isBalanced = balance && Math.abs(balance.totalDebit - balance.totalCredit) < 0.01

  async function handleReverse(transactionId: string) {
    setReverseError(null)
    try {
      await reverseTransaction.mutateAsync({ transactionId, actorId: session!.user.id })
    } catch {
      setReverseError('تعذّر التراجع عن هذه الحركة')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold text-white">دفتر القيد</h1>

      {balance && (
        <GlassCard
          className={
            isBalanced ? 'border-status-ok/40 bg-status-ok/10' : 'border-status-danger/40 bg-status-danger/10'
          }
        >
          <p className={isBalanced ? 'text-status-ok' : 'text-status-danger'}>
            {isBalanced ? '✓ متوازن' : '⚠ غير متوازن'} — مدين {balance.totalDebit.toFixed(2)} /
            دائن {balance.totalCredit.toFixed(2)}
          </p>
        </GlassCard>
      )}

      {reverseError && <ErrorBanner message={reverseError} />}
      {isLoading && <LoadingSpinner label="جارٍ تحميل الحركات..." />}
      {error && <ErrorBanner message="تعذّر تحميل دفتر القيد" />}

      <div className="flex flex-col divide-y divide-glass-border">
        {transactions?.map((txn) => (
          <div key={txn.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div>
              <span className="font-medium text-white">{typeLabels[txn.type] ?? txn.type}</span>
              {txn.supplier && <span className="ms-2 text-gray-400">{txn.supplier.name}</span>}
              <p className="mt-0.5 text-xs text-gray-500">
                {new Date(txn.created_at ?? '').toLocaleString('ar')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-gray-200">{txn.total.toFixed(2)}</span>
              {txn.reversed_by ? (
                <Badge variant="neutral">مُعاد</Badge>
              ) : (
                canReverse &&
                txn.type !== 'reversal' && (
                  <Button
                    variant="secondary"
                    onClick={() => handleReverse(txn.id)}
                    disabled={reverseTransaction.isPending}
                  >
                    تراجع
                  </Button>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {transactions && transactions.length === 0 && (
        <p className="text-sm text-gray-400">لا توجد حركات بعد.</p>
      )}
    </div>
  )
}
