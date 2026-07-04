import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import Swal from 'sweetalert2'
import { GlassCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/Button'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { listAccounts } from '../dashboard/queries'
import { dashboardKeys } from '../dashboard/hooks'
import { OPENING_ACCOUNTS } from './queries'
import { useSetOpeningBalance } from './hooks'

export function OpeningBalancesPage() {
  const { data: accounts } = useQuery({ queryKey: dashboardKeys.accounts, queryFn: listAccounts })
  const setBalance = useSetOpeningBalance()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const balanceOf = (code: string) => accounts?.find((a) => a.code === code)?.balance ?? 0

  async function submitOne(code: string, label: string, e: FormEvent) {
    e.preventDefault()
    setError(null)
    const raw = drafts[code]
    if (raw === undefined || raw === '') return
    const amount = Number(raw)
    const confirm = await Swal.fire({
      title: 'تأكيد الرصيد الافتتاحي',
      html: `الحاوية: <b>${label}</b><br/>الرصيد الحالي: <b>${balanceOf(code).toFixed(2)}</b><br/>المستهدف الجديد: <b>${amount.toFixed(2)}</b>`,
      showCancelButton: true,
      confirmButtonText: 'اعتماد',
      cancelButtonText: 'إلغاء',
    })
    if (!confirm.isConfirmed) return
    try {
      await setBalance.mutateAsync({ code, amount })
      setDrafts((d) => ({ ...d, [code]: '' }))
      await Swal.fire({ icon: 'success', title: 'حُدِّث الرصيد الافتتاحي', confirmButtonText: 'حسنًا' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذّر ضبط الرصيد')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-white">الأرصدة الافتتاحية</h1>
        <p className="text-sm text-gray-400">
          للمدير العام فقط — اضبط الرصيد الحقيقي الحالي لكل حاوية مال. يُرحَّل الفرق بقيد متوازن مقابل "حقوق افتتاحية".
        </p>
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {OPENING_ACCOUNTS.map(({ code, label }) => (
          <GlassCard key={code}>
            <form onSubmit={(e) => submitOne(code, label, e)} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-white">{label}</span>
                <span className="text-gray-400">
                  الحالي: <span className="font-mono">{balanceOf(code).toFixed(2)}</span>
                </span>
              </div>
              <div className="flex items-end gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="الرصيد الحقيقي"
                  value={drafts[code] ?? ''}
                  onChange={(e) => setDrafts((d) => ({ ...d, [code]: e.target.value }))}
                  className="flex-1 rounded-lg border border-glass-border bg-space-900 px-3 py-2 text-white outline-none focus:border-indigo-400"
                />
                <Button type="submit" disabled={setBalance.isPending}>
                  ضبط
                </Button>
              </div>
            </form>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}
