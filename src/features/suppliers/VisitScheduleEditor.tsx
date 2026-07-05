import { useState } from 'react'
import clsx from 'clsx'
import { Button } from '../../components/ui/Button'
import { Select, Input } from '../../components/ui/Input'
import { useUpdateSupplierVisitSchedule } from './hooks'
import { dayLabels, visitPatternLabels } from './visitSchedule'
import type { Supplier, VisitPattern } from '../../types/domain'

export function VisitScheduleEditor({ supplier }: { supplier: Supplier }) {
  const [pattern, setPattern] = useState<VisitPattern>(supplier.visit_pattern)
  const [days, setDays] = useState<number[]>(supplier.visit_days ?? [])
  const [dayOfMonth, setDayOfMonth] = useState(String(supplier.visit_day_of_month ?? ''))
  const [ordersBlocked, setOrdersBlocked] = useState(supplier.orders_blocked)
  const update = useUpdateSupplierVisitSchedule()

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))
  }

  async function save() {
    await update.mutateAsync({
      id: supplier.id,
      input: {
        visit_pattern: pattern,
        visit_days: pattern === 'weekly' ? days : null,
        visit_day_of_month: pattern === 'monthly' ? Number(dayOfMonth) || null : null,
        orders_blocked: ordersBlocked,
      },
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-gray-300">
        نمط أيام الزيارة
        <Select value={pattern} onChange={(e) => setPattern(e.target.value as VisitPattern)}>
          {Object.entries(visitPatternLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </label>

      {pattern === 'weekly' && (
        <div className="flex flex-wrap gap-2">
          {dayLabels.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className={clsx(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                days.includes(i)
                  ? 'border-brand-red-light/50 bg-brand-red/15 text-white'
                  : 'border-glass-border text-gray-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {pattern === 'monthly' && (
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          يوم الشهر (١-٣١)
          <Input
            type="number"
            min="1"
            max="31"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            className="max-w-[8rem]"
          />
        </label>
      )}

      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={ordersBlocked}
          onChange={(e) => setOrdersBlocked(e.target.checked)}
          className="h-4 w-4 accent-brand-red"
        />
        حظر الطلبية عن هذا المورد
      </label>

      <Button type="button" onClick={save} disabled={update.isPending} className="w-fit">
        {update.isPending ? 'جارٍ الحفظ...' : 'حفظ أيام الزيارة'}
      </Button>
    </div>
  )
}
