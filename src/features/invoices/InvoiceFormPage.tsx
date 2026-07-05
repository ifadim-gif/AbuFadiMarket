import { useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Swal from 'sweetalert2'
import { GlassCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/Button'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Input, Select } from '../../components/ui/Input'
import { useAuth } from '../auth/useAuth'
import { useHasRole } from '../auth/useHasRole'
import { useSuppliers } from '../suppliers/hooks'
import { useInvoice, useUpdateInvoice } from './hooks'
import { isDuplicatePaperNoError } from './queries'
import { InvoicePhotoCapture } from './InvoicePhotoCapture'
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
  const canManage = useHasRole(['admin', 'super_admin'])
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null)

  const [pickedSupplierId, setPickedSupplierId] = useState('')
  // مصدر المورد: عند التعديل من الفاتورة، وإلا من الرابط، وإلا من قائمة الاختيار.
  const needsPicker = !isEdit && !supplierIdFromQuery
  const { data: suppliers } = useSuppliers()
  const supplierId = isEdit
    ? existingInvoice?.supplier_id
    : supplierIdFromQuery ?? (pickedSupplierId || undefined)

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!supplierId) {
      setError('اختر موردًا للفاتورة')
      return
    }
    const input = {
      supplier_id: supplierId,
      paper_no: paperNo,
      amount: Number(amount),
      due_date: dueDate || null,
    }
    try {
      if (isEdit && id) {
        await updateInvoice.mutateAsync({ id, input })
        navigate(`/suppliers/${supplierId}`)
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
          navigate(`/suppliers/${supplierId}`)
        } else {
          // نبقى بالصفحة لإتاحة إرفاق صور الفاتورة فور توفّر معرّفها.
          setCreatedInvoiceId(result.id)
        }
      }
    } catch (err) {
      if (isDuplicatePaperNoError(err)) {
        setError('رقم الفاتورة هذا مستخدم مسبقًا لنفس المورد')
      } else {
        setError('تعذّر حفظ الفاتورة')
      }
    }
  }

  const submitting = captureInvoice.isPending || updateInvoice.isPending

  if (createdInvoiceId) {
    return (
      <GlassCard className="mx-auto flex max-w-md flex-col gap-4">
        <p className="text-status-ok">✓ حُفظت الفاتورة بنجاح</p>
        <InvoicePhotoCapture
          invoiceId={createdInvoiceId}
          actorId={session!.user.id}
          canManage={canManage}
        />
        <Button onClick={() => navigate(`/suppliers/${supplierId}`)}>تم</Button>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="mx-auto max-w-md">
      <h1 className="mb-4 text-lg font-bold text-white">
        {isEdit ? 'تعديل فاتورة' : 'فاتورة جديدة'}
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {needsPicker && (
          <label className="flex flex-col gap-1 text-sm text-gray-300">
            المورد
            <Select
              required
              value={pickedSupplierId}
              onChange={(e) => setPickedSupplierId(e.target.value)}
            >
              <option value="">اختر موردًا…</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          رقم الفاتورة الورقية
          <Input
            required
            inputMode="numeric"
            pattern="[0-9]*"
            value={paperNo}
            onChange={(e) => setPaperNo(e.target.value.replace(/[^0-9]/g, ''))}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          المبلغ
          <Input
            type="number"
            step="0.01"
            min="0"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          تاريخ الاستحقاق
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>
        {error && <ErrorBanner message={error} />}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'جارٍ الحفظ...' : 'حفظ'}
        </Button>
      </form>
      {isEdit && id && (
        <div className="mt-4 border-t border-glass-border pt-4">
          <InvoicePhotoCapture invoiceId={id} actorId={session!.user.id} canManage={canManage} />
        </div>
      )}
    </GlassCard>
  )
}
