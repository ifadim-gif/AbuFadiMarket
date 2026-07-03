import { useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import { GlassCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/Button'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useAuth } from '../auth/useAuth'
import { useInvoice, useUpdateInvoice } from './hooks'
import { isDuplicatePaperNoError } from './queries'
import { useCaptureInvoice } from '../capture/hooks'
import { haptic } from '../../lib/haptics'

export function InvoiceFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const [searchParams] = useSearchParams()
  const supplierIdFromQuery = searchParams.get('supplier')
  const navigate = useNavigate()
  const { session } = useAuth()

  const { data: existingInvoice, isLoading: loadingExisting } = useInvoice(id ?? '')
  const captureInvoice = useCaptureInvoice()
  const updateInvoice = useUpdateInvoice()

  const supplierId = isEdit ? existingInvoice?.supplier_id : supplierIdFromQuery

  const [paperNo, setPaperNo] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isEdit && existingInvoice && !initialized) {
    setPaperNo(existingInvoice.paper_no)
    setAmount(String(existingInvoice.amount))
    setDueDate(existingInvoice.due_date ?? '')
    setInitialized(true)
  }

  if (isEdit && loadingExisting) return <LoadingSpinner label="جارٍ تحميل الفاتورة..." />
  if (!supplierId) return <ErrorBanner message="لا يمكن تحديد المورد لهذه الفاتورة" />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const input = {
      supplier_id: supplierId!,
      paper_no: paperNo,
      amount: Number(amount),
      due_date: dueDate || null,
    }
    try {
      if (isEdit && id) {
        await updateInvoice.mutateAsync({ id, input })
      } else {
        const result = await captureInvoice.mutateAsync({ input, actorId: session!.user.id })
        haptic('success')
        if (result.mode === 'queued') {
          await Swal.fire({
            icon: 'info',
            title: 'حُفظت دون اتصال',
            text: 'ستُزامَن الفاتورة تلقائيًا عند عودة الشبكة.',
            confirmButtonText: 'حسنًا',
          })
        }
      }
      navigate(`/suppliers/${supplierId}`)
    } catch (err) {
      if (isDuplicatePaperNoError(err)) {
        setError('رقم الفاتورة هذا مستخدم مسبقًا لنفس المورد')
      } else {
        setError('تعذّر حفظ الفاتورة')
      }
    }
  }

  const submitting = captureInvoice.isPending || updateInvoice.isPending

  return (
    <GlassCard className="mx-auto max-w-md">
      <h1 className="mb-4 text-lg font-bold text-white">
        {isEdit ? 'تعديل فاتورة' : 'فاتورة جديدة'}
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          رقم الفاتورة الورقية
          <input
            required
            value={paperNo}
            onChange={(e) => setPaperNo(e.target.value)}
            className="rounded-lg border border-glass-border bg-space-900 px-3 py-2 text-white outline-none focus:border-indigo-400"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          المبلغ
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-lg border border-glass-border bg-space-900 px-3 py-2 text-white outline-none focus:border-indigo-400"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          تاريخ الاستحقاق
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-glass-border bg-space-900 px-3 py-2 text-white outline-none focus:border-indigo-400"
          />
        </label>
        {error && <ErrorBanner message={error} />}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'جارٍ الحفظ...' : 'حفظ'}
        </Button>
      </form>
    </GlassCard>
  )
}
