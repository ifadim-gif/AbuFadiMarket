import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { GlassCard } from '../../components/ui/GlassCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useHasCapability } from '../auth/useHasCapability'
import { arabicIncludes } from '../../lib/arabicSearch'
import { useCreateSupplier, useSuppliers } from './hooks'
import { SupplierExcelImport } from './SupplierExcelImport'

export function SuppliersListPage() {
  const { data: suppliers, isLoading, error } = useSuppliers()
  const canManage = useHasCapability('manage_finance')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!suppliers) return suppliers
    const q = search.trim()
    if (!q) return suppliers
    return suppliers.filter(
      (s) =>
        arabicIncludes(s.name, q) ||
        arabicIncludes(s.phone, q) ||
        String(s.supplier_no).includes(q),
    )
  }, [suppliers, search])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-white">الموردون</h1>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowImport((v) => !v)}>
              {showImport ? 'إلغاء' : 'استيراد إكسل'}
            </Button>
            <Button onClick={() => setShowForm((v) => !v)}>{showForm ? 'إلغاء' : 'مورد جديد'}</Button>
          </div>
        )}
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="بحث بالاسم أو الهاتف أو رقم المورد..."
      />

      {showImport && (
        <GlassCard>
          <SupplierExcelImport onDone={() => setShowImport(false)} />
        </GlassCard>
      )}

      {showForm && <CreateSupplierForm onDone={() => setShowForm(false)} />}

      {isLoading && <LoadingSpinner label="جارٍ تحميل الموردين..." />}
      {error && <ErrorBanner message="تعذّر تحميل الموردين" />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered?.map((s) => (
          <Link key={s.id} to={`/suppliers/${s.id}`}>
            <GlassCard className="h-full transition-colors hover:border-brand-red-light/40">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-white">{s.name}</h2>
                {s.red_flag && <Badge variant="danger">علامة حمراء</Badge>}
              </div>
              <p className="mt-1 text-xs text-gray-500">رقم المورد: {s.supplier_no}</p>
              {s.phone && <p className="mt-1 text-sm text-gray-400">{s.phone}</p>}
              <p className="mt-3 text-sm text-gray-300">
                الرصيد: <span className="font-mono">{s.balance.toFixed(2)}</span>
              </p>
            </GlassCard>
          </Link>
        ))}
      </div>

      {filtered && filtered.length === 0 && (
        <p className="text-sm text-gray-400">لا يوجد موردون مطابقون.</p>
      )}
    </div>
  )
}

function CreateSupplierForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const createSupplier = useCreateSupplier()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await createSupplier.mutateAsync({ name, phone: phone || null, visit_days: null })
    onDone()
  }

  return (
    <GlassCard>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          اسم المورد
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          الهاتف
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <Button type="submit" disabled={createSupplier.isPending}>
          حفظ
        </Button>
        {createSupplier.error && <ErrorBanner message="تعذّر إنشاء المورد" />}
      </form>
    </GlassCard>
  )
}
