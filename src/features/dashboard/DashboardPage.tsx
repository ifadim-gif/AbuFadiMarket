import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { GlassCard } from '../../components/ui/GlassCard'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { useAccounts, useChecksDueTimeline, useDashboardStats, useLedgerBalanceHistory } from './hooks'
import { useLedgerBalance } from '../ledger/hooks'

const chartTooltipStyle = { background: '#12172e', border: '1px solid #94a3fd29', borderRadius: 8 }
const chartLabelStyle = { color: '#e5e7eb' }
const axisColor = '#9ca3af'

export function DashboardPage() {
  const { data: stats, isLoading: loadingStats } = useDashboardStats()
  const { data: accounts, isLoading: loadingAccounts } = useAccounts()
  const { data: balance } = useLedgerBalance()
  const { data: checksDue, isLoading: loadingChecksDue } = useChecksDueTimeline()
  const { data: ledgerHistory, isLoading: loadingLedgerHistory } = useLedgerBalanceHistory()

  const isBalanced = balance && Math.abs(balance.totalDebit - balance.totalCredit) < 0.01

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold text-white">لوحة التحكم</h1>

      {loadingStats ? (
        <LoadingSpinner label="جارٍ تحميل المؤشرات..." />
      ) : (
        stats && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="عدد الموردين" value={stats.supplierCount} />
            <Kpi label="إجمالي ديون الموردين" value={stats.totalSupplierDebt.toFixed(2)} />
            <Kpi label="شيكات مستحقة خلال 7 أيام" value={stats.checksDueSoon} />
            <Kpi label="موردون بعلامة حمراء" value={stats.redFlaggedSuppliers} danger={stats.redFlaggedSuppliers > 0} />
          </div>
        )
      )}

      {balance && (
        <GlassCard
          className={
            isBalanced ? 'border-status-ok/40 bg-status-ok/10' : 'border-status-danger/40 bg-status-danger/10'
          }
        >
          <p className={isBalanced ? 'text-status-ok' : 'text-status-danger'}>
            {isBalanced ? '✓ دفتر القيد متوازن' : '⚠ دفتر القيد غير متوازن'}
          </p>
        </GlassCard>
      )}

      <GlassCard>
        <h2 className="mb-3 font-semibold text-white">حاويات المال</h2>
        {loadingAccounts ? (
          <LoadingSpinner label="جارٍ التحميل..." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {accounts?.map((a) => (
              <div key={a.id} className="rounded-lg border border-glass-border p-3">
                <p className="text-xs text-gray-400">{a.name_ar ?? a.code}</p>
                <p className="mt-1 font-mono text-white">{a.balance.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h2 className="mb-3 font-semibold text-white">الشيكات المستحقة عبر الزمن</h2>
          {loadingChecksDue ? (
            <LoadingSpinner label="جارٍ التحميل..." />
          ) : checksDue && checksDue.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={checksDue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
                  <XAxis dataKey="due_date" stroke={axisColor} fontSize={11} />
                  <YAxis stroke={axisColor} fontSize={11} />
                  <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartLabelStyle} />
                  <Bar dataKey="amount" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-400">لا توجد شيكات لها تاريخ استحقاق بعد.</p>
          )}
        </GlassCard>

        <GlassCard>
          <h2 className="mb-3 font-semibold text-white">تاريخ حركة الحاويات (تراكمي)</h2>
          {loadingLedgerHistory ? (
            <LoadingSpinner label="جارٍ التحميل..." />
          ) : ledgerHistory && ledgerHistory.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ledgerHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
                  <XAxis dataKey="date" stroke={axisColor} fontSize={10} />
                  <YAxis stroke={axisColor} fontSize={11} />
                  <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartLabelStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="cash_drawer" name="درج النقد" stroke="#34d399" dot={false} />
                  <Line type="monotone" dataKey="accumulated_cash" name="النقد المتراكم" stroke="#818cf8" dot={false} />
                  <Line type="monotone" dataKey="bank" name="البنك" stroke="#fbbf24" dot={false} />
                  <Line type="monotone" dataKey="checks_on_hand" name="الشيكات بحوزتنا" stroke="#38bdf8" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              ستظهر هنا حركة الحاويات بعد تسجيل أول عملية سداد أو إغلاق يومي.
            </p>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

function Kpi({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <GlassCard>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${danger ? 'text-status-danger' : 'text-white'}`}>{value}</p>
    </GlassCard>
  )
}
