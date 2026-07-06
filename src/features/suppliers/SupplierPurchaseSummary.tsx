import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import type { Invoice } from '../../types/domain'

type Preset = 'month' | 'year' | 'custom'

function startOfMonth(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function startOfYear(): string {
  const d = new Date()
  return new Date(d.getFullYear(), 0, 1).toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function SupplierPurchaseSummary({ invoices }: { invoices: Invoice[] }) {
  const [preset, setPreset] = useState<Preset>('month')
  const [from, setFrom] = useState(startOfMonth())
  const [to, setTo] = useState(today())

  function selectPreset(p: Preset) {
    setPreset(p)
    if (p === 'month') {
      setFrom(startOfMonth())
      setTo(today())
    } else if (p === 'year') {
      setFrom(startOfYear())
      setTo(today())
    }
  }

  const { total, count } = useMemo(() => {
    const fromTime = new Date(from).getTime()
    const toTime = new Date(to).getTime() + 24 * 60 * 60 * 1000 - 1
    const filtered = invoices.filter((inv) => {
      const t = new Date(inv.created_at ?? '').getTime()
      return t >= fromTime && t <= toTime
    })
    return {
      total: filtered.reduce((sum, inv) => sum + inv.amount, 0),
      count: filtered.length,
    }
  }, [invoices, from, to])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={preset === 'month' ? 'primary' : 'secondary'}
          onClick={() => selectPreset('month')}
        >
          هذا الشهر
        </Button>
        <Button
          type="button"
          variant={preset === 'year' ? 'primary' : 'secondary'}
          onClick={() => selectPreset('year')}
        >
          هذه السنة
        </Button>
        <Button
          type="button"
          variant={preset === 'custom' ? 'primary' : 'secondary'}
          onClick={() => setPreset('custom')}
        >
          نطاق مخصّص
        </Button>
      </div>

      {preset === 'custom' && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            من
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            إلى
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      )}

      <div className="rounded-lg border border-glass-border px-3 py-2 text-sm text-gray-200">
        إجمالي المشتريات ({count} فاتورة): <span className="font-mono font-bold">{total.toFixed(2)}</span>
      </div>
    </div>
  )
}
