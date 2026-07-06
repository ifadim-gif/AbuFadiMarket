import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { GlassCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/Button'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../auth/useAuth'
import { useSupplier } from '../suppliers/hooks'
import { useChecks } from '../checks/hooks'
import { usePaySupplier } from './hooks'
import { checkAndBroadcastRecord } from '../supernova/queries'

export function PaySupplierPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  const { data: supplier, isLoading: loadingSupplier } = useSupplier(id!)
  const { data: availableChecks, isLoading: loadingChecks } = useChecks('available')
  const paySupplier = usePaySupplier()

  const [cash, setCash] = useState('')
  const [drawer, setDrawer] = useState('')
  const [bank, setBank] = useState('')
  const [selectedCheckIds, setSelectedCheckIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const checksTotal = useMemo(
    () =>
      (availableChecks ?? [])
        .filter((c) => selectedCheckIds.includes(c.id))
        .reduce((sum, c) => sum + c.amount, 0),
    [availableChecks, selectedCheckIds],
  )
  const cashAmount = Number(cash) || 0
  const drawerAmount = Number(drawer) || 0
  const bankAmount = Number(bank) || 0
  const total = cashAmount + drawerAmount + bankAmount + checksTotal

  function toggleCheck(checkId: string) {
    setSelectedCheckIds((prev) =>
      prev.includes(checkId) ? prev.filter((id) => id !== checkId) : [...prev, checkId],
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (total <= 0) {
      setError('يجب إدخال مبلغ نقدي أو من الصندوق أو البنك أو اختيار شيك واحد على الأقل')
      return
    }
    try {
      const txnId = await paySupplier.mutateAsync({
        supplierId: id!,
        cash: cashAmount,
        drawer: drawerAmount,
        bank: bankAmount,
        checkIds: selectedCheckIds,
        actorId: session!.user.id,
      })
      void checkAndBroadcastRecord(txnId, total)
      navigate(`/suppliers/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تنفيذ عملية السداد')
    }
  }

  if (loadingSupplier || loadingChecks) return <LoadingSpinner label="جارٍ التحميل..." />
  if (!supplier) return <ErrorBanner message="تعذّر تحميل بيانات المورد" />

  return (
    <GlassCard className="mx-auto max-w-lg">
      <h1 className="mb-1 text-lg font-bold text-white">سداد {supplier.name}</h1>
      <p className="mb-4 text-sm text-gray-400">
        الرصيد الحالي: <span className="font-mono">{supplier.balance.toFixed(2)}</span>
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          نقد من النقد المتراكم
          <Input
            type="number"
            step="0.01"
            min="0"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-300">
          نقد من صندوق المبيعات
          <Input
            type="number"
            step="0.01"
            min="0"
            value={drawer}
            onChange={(e) => setDrawer(e.target.value)}
          />
          <span className="text-xs text-gray-500">يُسجَّل تلقائيًا كتفريغ للصندوق ثم سداد.</span>
        </label>

        <label className="flex flex-col gap-1 text-sm text-gray-300">
          شيك/تحويل بنكي من حساب البنك
          <Input
            type="number"
            step="0.01"
            min="0"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
          />
        </label>

        <div>
          <p className="mb-2 text-sm text-gray-300">الشيكات المتاحة</p>
          <div className="flex flex-col gap-2">
            {availableChecks?.map((c) => (
              <label
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-glass-border px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <Input
                    type="checkbox"
                    checked={selectedCheckIds.includes(c.id)}
                    onChange={() => toggleCheck(c.id)}
                  />
                  {c.drawer_name ?? 'بدون اسم'}
                </span>
                <span className="font-mono text-gray-300">{c.amount.toFixed(2)}</span>
              </label>
            ))}
            {availableChecks && availableChecks.length === 0 && (
              <p className="text-sm text-gray-500">لا توجد شيكات متاحة حاليًا.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-glass-border px-3 py-2 text-sm text-gray-200">
          إجمالي السداد: <span className="font-mono font-bold">{total.toFixed(2)}</span>
        </div>

        {error && <ErrorBanner message={error} />}

        <Button type="submit" disabled={paySupplier.isPending}>
          {paySupplier.isPending ? 'جارٍ التنفيذ...' : 'تنفيذ السداد'}
        </Button>
      </form>
    </GlassCard>
  )
}
