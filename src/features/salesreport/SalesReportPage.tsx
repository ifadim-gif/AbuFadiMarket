import { useMemo, useState, type FormEvent } from 'react'
import Swal from 'sweetalert2'
import { GlassCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/Button'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useAuth } from '../auth/useAuth'
import { useChecks } from '../checks/hooks'
import { useDailySalesReports, useRecordDailySales } from './hooks'

const todayStr = () => new Date().toISOString().slice(0, 10)

function NumField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-gray-300">
      {label}
      <input
        type="number"
        step="0.01"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-glass-border bg-space-900 px-3 py-2 text-white outline-none focus:border-indigo-400"
      />
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
    </label>
  )
}

export function SalesReportPage() {
  const { session } = useAuth()
  const record = useRecordDailySales()
  const { data: reports } = useDailySalesReports()
  const { data: allChecks } = useChecks()

  const [workDate, setWorkDate] = useState(todayStr())
  const [cashSales, setCashSales] = useState('')
  const [cardSales, setCardSales] = useState('')
  const [checkSales, setCheckSales] = useState('')
  const [creditInvoice, setCreditInvoice] = useState('')
  const [creditDelivery, setCreditDelivery] = useState('')
  const [recvCash, setRecvCash] = useState('')
  const [recvCheck, setRecvCheck] = useState('')
  const [recvCard, setRecvCard] = useState('')
  const [error, setError] = useState<string | null>(null)

  // مطابقة: مجموع شيكات البيع المسجَّلة في يوم العمل المختار.
  const registeredCheckSales = useMemo(() => {
    return (allChecks ?? [])
      .filter((c) => c.purpose === 'sale' && c.created_at?.slice(0, 10) === workDate)
      .reduce((sum, c) => sum + c.amount, 0)
  }, [allChecks, workDate])

  const num = (v: string) => Number(v) || 0
  const checkMismatch = num(checkSales) > 0 && Math.abs(num(checkSales) - registeredCheckSales) > 0.001

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (checkMismatch) {
      const proceed = await Swal.fire({
        icon: 'warning',
        title: 'الشيكات لا تطابق',
        html: `رقم الشيكات في التقرير: <b>${num(checkSales).toFixed(2)}</b><br/>الشيكات المسجَّلة لليوم: <b>${registeredCheckSales.toFixed(2)}</b><br/>سجِّل باقي الشيكات أولًا أو تابع.`,
        showCancelButton: true,
        confirmButtonText: 'متابعة رغم ذلك',
        cancelButtonText: 'رجوع',
      })
      if (!proceed.isConfirmed) return
    }

    try {
      await record.mutateAsync({
        input: {
          work_date: workDate,
          cash_sales: num(cashSales),
          card_sales: num(cardSales),
          check_sales: num(checkSales),
          credit_invoice: num(creditInvoice),
          credit_delivery: num(creditDelivery),
          recv_cash: num(recvCash),
          recv_check: num(recvCheck),
          recv_card: num(recvCard),
        },
        actorId: session!.user.id,
      })
      await Swal.fire({ icon: 'success', title: 'حُفظ تقرير المبيعات', confirmButtonText: 'حسنًا' })
      setCardSales('')
      setCheckSales('')
      setCreditInvoice('')
      setCreditDelivery('')
      setRecvCash('')
      setRecvCheck('')
      setRecvCard('')
      setCashSales('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر حفظ التقرير')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-white">تقرير المبيعات اليومي</h1>
        <p className="text-sm text-gray-400">
          النقدي والشيكات أرقام مرجعية للمطابقة؛ البطاقات والذمم تُرحَّل فورًا. تسوية النقدي في الإغلاق.
        </p>
      </div>

      <GlassCard>
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

          <h2 className="text-sm font-semibold text-indigo-300">المبيعات</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <NumField label="نقدي (مرجعي)" value={cashSales} onChange={setCashSales} />
            <NumField label="بطاقات اعتماد" value={cardSales} onChange={setCardSales} />
            <NumField
              label="شيكات مؤجلة (مرجعي)"
              value={checkSales}
              onChange={setCheckSales}
              hint={`مسجَّل لليوم: ${registeredCheckSales.toFixed(2)}`}
            />
            <NumField label="ذمم — חשبونية מס'" value={creditInvoice} onChange={setCreditInvoice} />
            <NumField label="ذمم — תעודת משלוח" value={creditDelivery} onChange={setCreditDelivery} />
          </div>

          <h2 className="text-sm font-semibold text-indigo-300">تحصيل ذمم العملاء</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <NumField label="نقدي (مرجعي)" value={recvCash} onChange={setRecvCash} />
            <NumField label="شيكات مؤجلة (مرجعي)" value={recvCheck} onChange={setRecvCheck} />
            <NumField label="بطاقات اعتماد" value={recvCard} onChange={setRecvCard} />
          </div>

          {checkMismatch && (
            <p className="text-xs text-status-warn">
              ⚠️ رقم الشيكات لا يطابق الشيكات المسجَّلة لليوم — سجِّل الباقي عبر شاشة الشيكات.
            </p>
          )}
          {error && <ErrorBanner message={error} />}

          <Button type="submit" disabled={record.isPending}>
            {record.isPending ? 'جارٍ الحفظ...' : 'حفظ تقرير اليوم'}
          </Button>
        </form>
      </GlassCard>

      <GlassCard>
        <h2 className="mb-2 text-sm font-semibold text-white">آخر التقارير</h2>
        <div className="flex flex-col divide-y divide-glass-border text-sm">
          {reports?.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-gray-300">{r.work_date}</span>
              <span className="text-gray-400">
                بطاقات {r.card_sales.toFixed(2)} · ذمم {(r.credit_invoice + r.credit_delivery).toFixed(2)}
              </span>
            </div>
          ))}
          {reports && reports.length === 0 && (
            <p className="py-2 text-gray-400">لا توجد تقارير مسجَّلة بعد.</p>
          )}
        </div>
      </GlassCard>
    </div>
  )
}
