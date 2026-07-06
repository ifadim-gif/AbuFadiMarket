import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GlassCard } from '../../components/ui/GlassCard'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { arabicIncludes } from '../../lib/arabicSearch'
import { useSuppliers } from './hooks'
import { dayLabels, isSupplierDueOn } from './visitSchedule'

export function TodayMerchantsPage() {
  const { data: suppliers, isLoading, error } = useSuppliers()
  const [search, setSearch] = useState('')
  const today = useMemo(() => new Date(), [])

  const dueToday = useMemo(
    () => suppliers?.filter((s) => isSupplierDueOn(s, today)) ?? [],
    [suppliers, today],
  )

  const searched = useMemo(() => {
    const q = search.trim()
    if (!q || !suppliers) return null
    return suppliers.filter((s) => arabicIncludes(s.name, q))
  }, [suppliers, search])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-white">تجار اليوم</h1>
        <p className="text-sm text-gray-400">
          {dayLabels[today.getDay()]} {today.toISOString().slice(0, 10)} — الموردون المتوقّع
          حضورهم اليوم حسب جدول الزيارة. حضور تاجر بيوم غير يومه ممكن دائمًا، لذا استخدم البحث أدناه
          لأي مورد.
        </p>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="ابحث عن أي تاجر بغضّ النظر عن يومه..."
      />

      {isLoading && <LoadingSpinner label="جارٍ التحميل..." />}
      {error && <ErrorBanner message="تعذّر تحميل الموردين" />}

      <SupplierGrid
        title={searched ? 'نتائج البحث' : `تجار ${dayLabels[today.getDay()]}`}
        suppliers={searched ?? dueToday}
        emptyText={searched ? 'لا نتائج مطابقة.' : 'لا موردين مجدولين لهذا اليوم.'}
      />
    </div>
  )
}

function SupplierGrid({
  title,
  suppliers,
  emptyText,
}: {
  title: string
  suppliers: { id: string; name: string; phone: string | null; supplier_no: number; red_flag: boolean; orders_blocked: boolean }[]
  emptyText: string
}) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-gray-300">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {suppliers.map((s) => (
          <Link key={s.id} to={`/suppliers/${s.id}`}>
            <GlassCard className="h-full transition-colors hover:border-brand-red-light/40">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-white">{s.name}</h3>
                {s.red_flag && <Badge variant="danger">علامة حمراء</Badge>}
              </div>
              <p className="mt-1 text-xs text-gray-500">رقم المورد: {s.supplier_no}</p>
              {s.phone && <p className="mt-1 text-sm text-gray-400">{s.phone}</p>}
              {s.orders_blocked && <Badge variant="warn" className="mt-2">الطلبية محظورة</Badge>}
            </GlassCard>
          </Link>
        ))}
      </div>
      {suppliers.length === 0 && <p className="text-sm text-gray-400">{emptyText}</p>}
    </div>
  )
}
