import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { GlassCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/Button'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { Input, Select } from '../../components/ui/Input'
import { useAuth } from '../auth/useAuth'
import { useCreateCheck } from './hooks'
import type { CheckPurpose } from './queries'

export function CheckFormPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const createCheck = useCreateCheck()
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [drawerName, setDrawerName] = useState('')
  const [customerRef, setCustomerRef] = useState('')
  const [purpose, setPurpose] = useState<CheckPurpose>('sale')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const checkId = await createCheck.mutateAsync({
      input: {
        amount: Number(amount),
        due_date: dueDate || null,
        drawer_name: drawerName || null,
        customer_ref: customerRef || null,
        purpose,
      },
      actorId: session!.user.id,
    })
    navigate(`/checks/${checkId}`)
  }

  return (
    <GlassCard className="mx-auto max-w-md">
      <h1 className="mb-4 text-lg font-bold text-white">شيك جديد</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          غرض الشيك
          <Select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as CheckPurpose)}
          >
            <option value="sale">بيع جديد</option>
            <option value="receivable_settlement">تحصيل ذمّة عميل</option>
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          المبلغ
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
          صاحب الشيك
          <Input
            value={drawerName}
            onChange={(e) => setDrawerName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          رقم حساب الزبون (في نظام الكاش)
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            value={customerRef}
            onChange={(e) => setCustomerRef(e.target.value.replace(/[^0-9]/g, ''))}
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
        {createCheck.error && <ErrorBanner message="تعذّر حفظ الشيك" />}
        <Button type="submit" disabled={createCheck.isPending}>
          {createCheck.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
        </Button>
      </form>
    </GlassCard>
  )
}
