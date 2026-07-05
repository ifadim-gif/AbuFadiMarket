import { useState, type FormEvent } from 'react'
import Swal from 'sweetalert2'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useCreateOrderInvoice } from '../invoices/hooks'

export function SupplierOrdersSection({
  supplierId,
  actorId,
}: {
  supplierId: string
  actorId: string
}) {
  const createOrder = useCreateOrderInvoice()
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const value = Number(amount)
    if (!value || value <= 0) {
      setError('أدخل مبلغ الطلبية')
      return
    }
    if (!navigator.onLine) {
      setError('تسجيل الطلبية يحتاج اتصالًا بالإنترنت (لتوليد رقمها التسلسلي)')
      return
    }
    try {
      const invoice = await createOrder.mutateAsync({
        input: { supplier_id: supplierId, amount: value, due_date: dueDate || null },
        actorId,
      })
      setAmount('')
      setDueDate('')
      await Swal.fire({
        icon: 'success',
        title: 'سُجِّلت الطلبية كدَين',
        text: `رقمها التلقائي: ${invoice.paper_no} — يُعدَّل لاحقًا عند وصول الفاتورة.`,
        confirmButtonText: 'حسنًا',
      })
    } catch {
      setError('تعذّر تسجيل الطلبية')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-500">
        استلام بضاعة بلا فاتورة ورقية — تُسجَّل فورًا كدَين حقيقي على المورد برقم تلقائي
        (‏NO-#####)، ويظهر ضمن الفواتير أدناه. عند وصول الفاتورة الورقية عدّل رقمها من زر "تعديل".
      </p>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          مبلغ الطلبية
          <Input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          تاريخ استحقاق متوقّع (اختياري)
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <Button type="submit" disabled={createOrder.isPending}>
          {createOrder.isPending ? 'جارٍ التسجيل...' : 'تسجيل طلبية بدَين'}
        </Button>
      </form>
      {error && <ErrorBanner message={error} />}
    </div>
  )
}
