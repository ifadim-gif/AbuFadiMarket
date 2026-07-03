import { useMemo, useState, type FormEvent } from 'react'
import Swal from 'sweetalert2'
import { GlassCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/Button'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useAuth } from '../auth/useAuth'
import { useDailySalesReports } from '../salesreport/hooks'
import { useCloseDailyOrbit, useDailyCloses, useDrawerAccount } from './hooks'

const todayStr = () => new Date().toISOString().slice(0, 10)

export function DailyClosePage() {
  const { session } = useAuth()
  const { data: drawer, isLoading: loadingDrawer } = useDrawerAccount()
  const { data: reports } = useDailySalesReports()
  const { data: closes } = useDailyCloses()
  const closeDailyOrbit = useCloseDailyOrbit()

  const [workDate, setWorkDate] = useState(todayStr())
  const [counted, setCounted] = useState('')
  const [newFloat, setNewFloat] = useState('')
  const [error, setError] = useState<string | null>(null)

  const expected = drawer?.balance ?? 0
  const countedNum = Number(counted) || 0
  const floatNum = newFloat === '' ? expected : Number(newFloat) || 0
  const report = useMemo(
    () => reports?.find((r) => r.work_date === workDate),
    [reports, workDate],
  )
  const recvCash = report?.recv_cash ?? 0
  const reportCash = report?.cash_sales ?? null
  const intake = countedNum - expected
  const cashRevenue = intake - recvCash
  const secondDrawer = reportCash === null ? null : cashRevenue - reportCash

  if (loadingDrawer) return <LoadingSpinner label="جارٍ التحميل..." />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const confirm = await Swal.fire({
      title: 'تأكيد إغلاق النقد',
      html:
        `يوم العمل: <b>${workDate}</b><br/>` +
        `المتوقّع بالدفتر: <b>${expected.toFixed(2)}</b><br/>` +
        `المعدود: <b>${countedNum.toFixed(2)}</b><br/>` +
        `المدخل النقدي: <b>${intake.toFixed(2)}</b><br/>` +
        `تحصيل ذمم نقدي: <b>${recvCash.toFixed(2)}</b><br/>` +
        `إيراد نقدي: <b>${cashRevenue.toFixed(2)}</b><br/>` +
        (secondDrawer !== null ? `الصندوق الثاني: <b>${secondDrawer.toFixed(2)}</b><br/>` : '') +
        `الافتتاحية الجديدة: <b>${floatNum.toFixed(2)}</b>`,
      showCancelButton: true,
      confirmButtonText: 'تأكيد الإغلاق',
      cancelButtonText: 'إلغاء',
    })
    if (!confirm.isConfirmed) return

    try {
      await closeDailyOrbit.mutateAsync({
        counted: countedNum,
        actorId: session!.user.id,
        workDate,
        newFloat: newFloat === '' ? undefined : floatNum,
      })
      await Swal.fire({ icon: 'success', title: 'تم إغلاق النقد بنجاح', confirmButtonText: 'حسنًا' })
      setCounted('')
      setNewFloat('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر إغلاق النقد')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-white">إغلاق النقد اليومي</h1>
        <p className="text-sm text-gray-400">
          المعدود هو الحقيقة: المدخل = المعدود − المتوقّع؛ منه تحصيل الذمم، والباقي إيراد نقدي.
        </p>
      </div>

      <GlassCard className="max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-gray-300">
            تاريخ يوم العمل
            <input
              type="date"
              required
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
              className="rounded-lg border border-glass-border bg-space-900 px-3 py-2 text-white outline-none focus:border-indigo-400"
            />
          </label>
          <p className="text-sm text-gray-400">
            رصيد الدرج المتوقّع: <span className="font-mono">{expected.toFixed(2)}</span>
          </p>
          <label className="flex flex-col gap-1 text-sm text-gray-300">
            المبلغ المعدود فعليًا
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={counted}
              onChange={(e) => setCounted(e.target.value)}
              className="rounded-lg border border-glass-border bg-space-900 px-3 py-2 text-white outline-none focus:border-indigo-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-300">
            الافتتاحية الجديدة (يبقى في الدرج)
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder={expected.toFixed(2)}
              value={newFloat}
              onChange={(e) => setNewFloat(e.target.value)}
              className="rounded-lg border border-glass-border bg-space-900 px-3 py-2 text-white outline-none focus:border-indigo-400"
            />
            <span className="text-xs text-gray-500">فارغ = إبقاء الدرج على المتوقّع.</span>
          </label>

          <div className="rounded-lg border border-glass-border px-3 py-2 text-sm text-gray-200">
            <div className="flex justify-between"><span>المدخل النقدي</span><span className="font-mono">{intake.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>تحصيل ذمم نقدي</span><span className="font-mono">{recvCash.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>إيراد نقدي</span><span className="font-mono">{cashRevenue.toFixed(2)}</span></div>
            {secondDrawer !== null && (
              <div className="flex justify-between text-status-warn">
                <span>الصندوق الثاني</span><span className="font-mono">{secondDrawer.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between"><span>للمتراكم</span><span className="font-mono">{(countedNum - floatNum).toFixed(2)}</span></div>
          </div>

          {error && <ErrorBanner message={error} />}
          <Button type="submit" disabled={closeDailyOrbit.isPending}>
            {closeDailyOrbit.isPending ? 'جارٍ التنفيذ...' : 'إغلاق النقد'}
          </Button>
        </form>
      </GlassCard>

      <GlassCard>
        <h2 className="mb-2 text-sm font-semibold text-white">آخر عمليات الإغلاق</h2>
        <div className="flex flex-col divide-y divide-glass-border text-sm">
          {closes?.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-gray-300">{c.close_date}</span>
              <span className="text-gray-400">
                إيراد نقدي {(c.cash_revenue ?? 0).toFixed(2)}
                {c.stardust_awarded > 0 && <span className="ms-2 text-indigo-300">✨ {c.stardust_awarded}</span>}
              </span>
            </div>
          ))}
          {closes && closes.length === 0 && <p className="py-2 text-gray-400">لا عمليات إغلاق بعد.</p>}
        </div>
      </GlassCard>
    </div>
  )
}
