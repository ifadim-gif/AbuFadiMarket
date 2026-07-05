import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/Button'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../auth/useAuth'
import { useChecks } from '../checks/hooks'
import { listAccounts } from '../dashboard/queries'
import { dashboardKeys } from '../dashboard/hooks'
import {
  useClearCheck,
  useCollectCardClearing,
  useDepositCheck,
  useSettleReceivableTransfer,
} from './hooks'

export function BackOfficePage() {
  const { session } = useAuth()
  const actorId = session!.user.id
  const { data: accounts } = useQuery({ queryKey: dashboardKeys.accounts, queryFn: listAccounts })
  const { data: availableChecks, isLoading: loadingAvail } = useChecks('available')
  const { data: depositedChecks } = useChecks('deposited')

  const deposit = useDepositCheck()
  const clear = useClearCheck()
  const collect = useCollectCardClearing()
  const settle = useSettleReceivableTransfer()

  const [collectAmount, setCollectAmount] = useState('')
  const [settleAmount, setSettleAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  const balanceOf = (code: string) => accounts?.find((a) => a.code === code)?.balance ?? 0

  async function run<T>(fn: () => Promise<T>) {
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تنفيذ العملية')
    }
  }

  async function handleCollect(e: FormEvent) {
    e.preventDefault()
    await run(() => collect.mutateAsync({ amount: Number(collectAmount), actorId }))
    setCollectAmount('')
  }

  async function handleSettle(e: FormEvent) {
    e.preventDefault()
    await run(() => settle.mutateAsync({ amount: Number(settleAmount), actorId }))
    setSettleAmount('')
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-white">الباك أوفيس</h1>
        <p className="text-sm text-gray-400">
          إيداع/صرف الشيكات، التحصيل الشهري للبطاقات، وسداد ذمم العملاء بالتحويل البنكي.
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <GlassCard className="text-sm">
          <p className="text-gray-400">بطاقات قيد التحصيل</p>
          <p className="font-mono text-lg text-white">{balanceOf('card_clearing').toFixed(2)}</p>
        </GlassCard>
        <GlassCard className="text-sm">
          <p className="text-gray-400">ذمم العملاء</p>
          <p className="font-mono text-lg text-white">{balanceOf('customer_receivable').toFixed(2)}</p>
        </GlassCard>
        <GlassCard className="text-sm">
          <p className="text-gray-400">البنك</p>
          <p className="font-mono text-lg text-white">{balanceOf('bank').toFixed(2)}</p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <GlassCard>
          <h2 className="mb-2 text-sm font-semibold text-white">شيكات متاحة — إيداع للبنك</h2>
          {loadingAvail && <LoadingSpinner label="جارٍ التحميل..." />}
          <div className="flex flex-col divide-y divide-glass-border text-sm">
            {availableChecks?.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 py-2">
                <span className="text-gray-300">
                  {c.drawer_name ?? 'بدون اسم'} · <span className="font-mono">{c.amount.toFixed(2)}</span>
                </span>
                <Button
                  variant="secondary"
                  onClick={() => run(() => deposit.mutateAsync({ checkId: c.id, actorId }))}
                  disabled={deposit.isPending}
                >
                  إيداع
                </Button>
              </div>
            ))}
            {availableChecks && availableChecks.length === 0 && (
              <p className="py-2 text-gray-400">لا توجد شيكات متاحة.</p>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="mb-2 text-sm font-semibold text-white">شيكات مودَعة — صرف نهائي</h2>
          <div className="flex flex-col divide-y divide-glass-border text-sm">
            {depositedChecks?.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 py-2">
                <span className="text-gray-300">
                  {c.drawer_name ?? 'بدون اسم'} · <span className="font-mono">{c.amount.toFixed(2)}</span>
                </span>
                <Button
                  variant="secondary"
                  onClick={() => run(() => clear.mutateAsync({ checkId: c.id, actorId }))}
                  disabled={clear.isPending}
                >
                  صرف
                </Button>
              </div>
            ))}
            {depositedChecks && depositedChecks.length === 0 && (
              <p className="py-2 text-gray-400">لا توجد شيكات مودَعة.</p>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="mb-2 text-sm font-semibold text-white">تحصيل البطاقات (شهري)</h2>
          <form onSubmit={handleCollect} className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm text-gray-300">
              المبلغ المُحصَّل للبنك
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
              />
            </label>
            <Button type="submit" disabled={collect.isPending}>
              تحصيل
            </Button>
          </form>
        </GlassCard>

        <GlassCard>
          <h2 className="mb-2 text-sm font-semibold text-white">سداد ذمّة بتحويل بنكي</h2>
          <form onSubmit={handleSettle} className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-sm text-gray-300">
              المبلغ المُحوَّل
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
              />
            </label>
            <Button type="submit" disabled={settle.isPending}>
              سداد
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  )
}
