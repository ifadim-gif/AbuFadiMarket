import { useState, type FormEvent } from 'react'
import { GlassCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useAuth } from '../auth/useAuth'
import { useCreateObligation, useObligations, useToggleObligationSettled } from './hooks'

export function ObligationsPage() {
  const { data: obligations, isLoading, error } = useObligations()
  const { session } = useAuth()
  const createObligation = useCreateObligation()
  const toggleSettled = useToggleObligationSettled()

  const [amount, setAmount] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await createObligation.mutateAsync({
      input: {
        amount: Number(amount),
        expected_date: expectedDate,
        category: category || null,
        note: note || null,
      },
      actorId: session!.user.id,
    })
    setAmount('')
    setExpectedDate('')
    setCategory('')
    setNote('')
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold text-white">الالتزامات المتوقّعة</h1>
      <p className="text-sm text-gray-400">
        شيكات صادرة من بنك المحل، ضريبة، تأمين، مصاريف سيارة... تُغذّي سديم التدفّق النقدي.
      </p>

      <GlassCard>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-gray-300">
            المبلغ
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-lg border border-glass-border bg-space-900 px-3 py-2 text-white outline-none focus:border-indigo-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-300">
            التاريخ المتوقّع
            <input
              type="date"
              required
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="rounded-lg border border-glass-border bg-space-900 px-3 py-2 text-white outline-none focus:border-indigo-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-300">
            الفئة
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="ضريبة، تأمين، شيك صادر..."
              className="rounded-lg border border-glass-border bg-space-900 px-3 py-2 text-white outline-none focus:border-indigo-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-300">
            ملاحظة
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-lg border border-glass-border bg-space-900 px-3 py-2 text-white outline-none focus:border-indigo-400"
            />
          </label>
          <Button type="submit" disabled={createObligation.isPending}>
            إضافة
          </Button>
        </form>
        {createObligation.error && <ErrorBanner message="تعذّر إضافة الالتزام" />}
      </GlassCard>

      {isLoading && <LoadingSpinner label="جارٍ التحميل..." />}
      {error && <ErrorBanner message="تعذّر تحميل الالتزامات" />}

      <div className="flex flex-col divide-y divide-glass-border">
        {obligations?.map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <div>
              <span className="font-mono text-gray-200">{o.amount.toFixed(2)}</span>
              {o.category && <span className="ms-2 text-gray-400">{o.category}</span>}
              <span className="ms-2 text-gray-500">{o.expected_date}</span>
              {o.note && <p className="text-xs text-gray-500">{o.note}</p>}
            </div>
            <div className="flex items-center gap-2">
              {o.is_settled ? (
                <Badge variant="ok">مُسدَّد</Badge>
              ) : (
                <Badge variant="warn">قائم</Badge>
              )}
              <Button
                variant="secondary"
                onClick={() => toggleSettled.mutate({ id: o.id, isSettled: !o.is_settled })}
                disabled={toggleSettled.isPending}
              >
                {o.is_settled ? 'إعادة فتح' : 'تحديد كمُسدَّد'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {obligations && obligations.length === 0 && (
        <p className="text-sm text-gray-400">لا توجد التزامات متوقّعة مسجَّلة بعد.</p>
      )}
    </div>
  )
}
