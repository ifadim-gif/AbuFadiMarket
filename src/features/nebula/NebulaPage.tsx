import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { GlassCard } from '../../components/ui/GlassCard'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useCashFlowProjection } from './hooks'

export function NebulaPage() {
  const { data: projection, isLoading, error } = useCashFlowProjection(30)

  const blackHoleDay = projection?.find((d) => d.is_black_hole)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold text-white">🌫️ سديم التدفّق النقدي</h1>
      <p className="text-sm text-gray-400">
        إسقاط السيولة المتوقّعة لِـ 30 يومًا قادمة مقابل ديون الموردين (حسب أقرب يوم زيارة) والالتزامات المتوقّعة.
      </p>

      {isLoading && <LoadingSpinner label="جارٍ حساب الإسقاط..." />}
      {error && <ErrorBanner message="تعذّر حساب السديم" />}

      {blackHoleDay ? (
        <GlassCard className="border-status-danger/40 bg-status-danger/10">
          <p className="text-status-danger">
            ⚠ ثقب أسود للسيولة متوقّع بتاريخ {blackHoleDay.day} — السيولة المتوقّعة ستصبح سالبة.
          </p>
        </GlassCard>
      ) : (
        projection && (
          <GlassCard className="border-status-ok/40 bg-status-ok/10">
            <p className="text-status-ok">✓ لا ثقوب سوداء متوقّعة خلال الأفق الحالي.</p>
          </GlassCard>
        )
      )}

      {projection && (
        <GlassCard>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projection}>
                <defs>
                  <linearGradient id="liquidityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" />
                <XAxis dataKey="day" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: '#12172e', border: '1px solid #94a3fd29', borderRadius: 8 }}
                  labelStyle={{ color: '#e5e7eb' }}
                />
                <ReferenceLine y={0} stroke="#f87171" strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="projected_liquidity"
                  stroke="#818cf8"
                  fill="url(#liquidityGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
