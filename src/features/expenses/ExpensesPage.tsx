import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import Swal from 'sweetalert2'
import { GlassCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/Button'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { Input, Select } from '../../components/ui/Input'
import { useAuth } from '../auth/useAuth'
import { useHasCapability } from '../auth/useHasCapability'
import { listAccounts } from '../dashboard/queries'
import { dashboardKeys } from '../dashboard/hooks'
import { CategoryPicker } from '../categories/CategoryPicker'
import { useRecordExpense } from './hooks'
import type { ExpenseSource } from './queries'

export function ExpensesPage() {
  const { session } = useAuth()
  const canManage = useHasCapability('manage_finance')
  const { data: accounts } = useQuery({ queryKey: dashboardKeys.accounts, queryFn: listAccounts })
  const record = useRecordExpense()

  const [amount, setAmount] = useState('')
  const [source, setSource] = useState<ExpenseSource>('cash_drawer')
  const [note, setNote] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const balanceOf = (code: string) => accounts?.find((a) => a.code === code)?.balance ?? 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await record.mutateAsync({
        input: { amount: Number(amount), source, note: note || null, categoryId },
        actorId: session!.user.id,
      })
      await Swal.fire({ icon: 'success', title: 'سُجِّل المصروف', confirmButtonText: 'حسنًا' })
      setAmount('')
      setNote('')
      setCategoryId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر تسجيل المصروف')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-white">المصروفات النقدية</h1>
        <p className="text-sm text-gray-400">مصروف يُخصم من الدرج أو النقد المتراكم ويُرحَّل لحساب المصروفات.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="text-sm">
          <p className="text-gray-400">درج النقد</p>
          <p className="font-mono text-lg text-white">{balanceOf('cash_drawer').toFixed(2)}</p>
        </GlassCard>
        <GlassCard className="text-sm">
          <p className="text-gray-400">النقد المتراكم</p>
          <p className="font-mono text-lg text-white">{balanceOf('accumulated_cash').toFixed(2)}</p>
        </GlassCard>
      </div>

      <GlassCard className="max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            المصدر
            <Select
              value={source}
              onChange={(e) => setSource(e.target.value as ExpenseSource)}
            >
              <option value="cash_drawer">درج النقد</option>
              <option value="accumulated_cash">النقد المتراكم</option>
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-300">
            مجموعة المصروف
            <CategoryPicker kind="expense" value={categoryId} onChange={setCategoryId} canCreate={canManage} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-300">
            ملاحظة
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="سبب المصروف"
            />
          </label>
          {error && <ErrorBanner message={error} />}
          <Button type="submit" disabled={record.isPending}>
            {record.isPending ? 'جارٍ الحفظ...' : 'تسجيل المصروف'}
          </Button>
        </form>
      </GlassCard>
    </div>
  )
}
