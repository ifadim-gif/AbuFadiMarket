import { useState, type FormEvent } from 'react'
import Swal from 'sweetalert2'
import { GlassCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useLoans, useRecordBankLoan, useRecordLoanPayment } from './hooks'
import type { LoanPaymentSource, LoanRow } from './queries'

export function LoansSection() {
  const { data: loans, isLoading, error } = useLoans()
  const recordLoan = useRecordBankLoan()
  const [party, setParty] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    try {
      await recordLoan.mutateAsync({ party, amount: Number(amount), note: note || null })
      setParty('')
      setAmount('')
      setNote('')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'تعذّر تسجيل القرض')
    }
  }

  return (
    <GlassCard>
      <h2 className="mb-1 font-semibold text-white">القروض البنكية</h2>
      <p className="mb-3 text-xs text-gray-500">
        استلام قرض يدخل حساب البنك ويُنشئ التزامًا. كل قسط يُسجَّل على القرض فتُتابَع الدفعات
        (المدفوع/المتبقّي) لكل جهة.
      </p>

      <form onSubmit={handleCreate} className="mb-4 flex flex-wrap items-end gap-3 border-b border-glass-border pb-4">
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          الجهة المُقرِضة
          <Input required value={party} onChange={(e) => setParty(e.target.value)} placeholder="بنك القاهرة عمّان..." />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          مبلغ القرض
          <Input type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          ملاحظة
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <Button type="submit" disabled={recordLoan.isPending}>
          {recordLoan.isPending ? 'جارٍ التسجيل...' : 'تسجيل قرض'}
        </Button>
        {formError && <ErrorBanner message={formError} />}
      </form>

      {isLoading && <LoadingSpinner label="جارٍ التحميل..." />}
      {error && <ErrorBanner message="تعذّر تحميل القروض" />}

      <div className="flex flex-col divide-y divide-glass-border">
        {loans?.map((loan) => <LoanRowView key={loan.id} loan={loan} />)}
        {loans && loans.length === 0 && (
          <p className="py-2 text-sm text-gray-400">لا قروض مسجَّلة بعد.</p>
        )}
      </div>
    </GlassCard>
  )
}

function LoanRowView({ loan }: { loan: LoanRow }) {
  const pay = useRecordLoanPayment()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [source, setSource] = useState<LoanPaymentSource>('bank')
  const [error, setError] = useState<string | null>(null)
  const settled = loan.remaining <= 0

  async function handlePay(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'تأكيد سداد قسط',
      text: `سداد ${Number(amount).toFixed(2)} لقرض "${loan.party_name}".`,
      showCancelButton: true,
      confirmButtonText: 'سداد',
      cancelButtonText: 'إلغاء',
    })
    if (!confirm.isConfirmed) return
    try {
      await pay.mutateAsync({ loanId: loan.id, amount: Number(amount), source, note: null })
      setAmount('')
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر سداد القسط')
    }
  }

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="font-semibold text-white">{loan.party_name}</span>
          {loan.note && <p className="text-xs text-gray-500">{loan.note}</p>}
        </div>
        {settled ? <Badge variant="ok">مُسدَّد</Badge> : <Badge variant="warn">قائم</Badge>}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-300">
        <span>الأصل: <span className="font-mono">{loan.principal.toFixed(2)}</span></span>
        <span>المدفوع: <span className="font-mono text-status-ok">{loan.paid.toFixed(2)}</span></span>
        <span>المتبقّي: <span className="font-mono text-status-warn">{loan.remaining.toFixed(2)}</span></span>
      </div>

      {!settled && (
        <div>
          {open ? (
            <form onSubmit={handlePay} className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs text-gray-400">
                مبلغ القسط
                <Input type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className="max-w-[8rem]" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-400">
                المصدر
                <Select value={source} onChange={(e) => setSource(e.target.value as LoanPaymentSource)}>
                  <option value="bank">البنك</option>
                  <option value="accumulated_cash">النقد المتراكم</option>
                </Select>
              </label>
              <Button type="submit" disabled={pay.isPending}>
                {pay.isPending ? 'جارٍ...' : 'تأكيد'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              {error && <ErrorBanner message={error} />}
            </form>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
              سداد قسط
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
