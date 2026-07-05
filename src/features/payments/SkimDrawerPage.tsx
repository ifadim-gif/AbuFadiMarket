import { useState, type FormEvent } from 'react'
import { GlassCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/Button'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { Input } from '../../components/ui/Input'
import { useAuth } from '../auth/useAuth'
import { useAccounts } from '../dashboard/hooks'
import { useSkimDrawer } from './hooks'

export function SkimDrawerPage() {
  const { session } = useAuth()
  const { data: accounts, isLoading } = useAccounts()
  const skimDrawer = useSkimDrawer()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const drawer = accounts?.find((a) => a.code === 'cash_drawer')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    try {
      await skimDrawer.mutateAsync({ amount: Number(amount), actorId: session!.user.id })
      setAmount('')
      setSuccess(true)
    } catch {
      setError('تعذّر إفراغ الدرج — تحقق من أن المبلغ لا يتجاوز رصيد الدرج')
    }
  }

  if (isLoading) return <LoadingSpinner label="جارٍ التحميل..." />

  return (
    <GlassCard className="mx-auto max-w-md">
      <h1 className="mb-1 text-lg font-bold text-white">إفراغ الدرج</h1>
      <p className="mb-4 text-sm text-gray-400">
        رصيد الدرج الحالي: <span className="font-mono">{drawer?.balance.toFixed(2) ?? '—'}</span>
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          المبلغ المراد نقله إلى النقد المتراكم
          <Input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        {error && <ErrorBanner message={error} />}
        {success && <p className="text-sm text-status-ok">تم إفراغ الدرج بنجاح.</p>}
        <Button type="submit" disabled={skimDrawer.isPending}>
          {skimDrawer.isPending ? 'جارٍ التنفيذ...' : 'إفراغ الدرج'}
        </Button>
      </form>
    </GlassCard>
  )
}
