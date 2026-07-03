import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { GlassCard } from '../../components/ui/GlassCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useHasRole } from '../auth/useHasRole'
import { useCreateSupplier, useSuppliers } from './hooks'

export function SuppliersListPage() {
  const { data: suppliers, isLoading, error } = useSuppliers()
  const canManage = useHasRole(['admin', 'super_admin'])
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">الموردون</h1>
        {canManage && (
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'إلغاء' : 'مورد جديد'}
          </Button>
        )}
      </div>

      {showForm && <CreateSupplierForm onDone={() => setShowForm(false)} />}

      {isLoading && <LoadingSpinner label="جارٍ تحميل الموردين..." />}
      {error && <ErrorBanner message="تعذّر تحميل الموردين" />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {suppliers?.map((s) => (
          <Link key={s.id} to={`/suppliers/${s.id}`}>
            <GlassCard className="h-full transition-colors hover:border-indigo-400/40">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-white">{s.name}</h2>
                {s.red_flag && <Badge variant="danger">علامة حمراء</Badge>}
              </div>
              {s.phone && <p className="mt-1 text-sm text-gray-400">{s.phone}</p>}
              <p className="mt-3 text-sm text-gray-300">
                الرصيد: <span className="font-mono">{s.balance.toFixed(2)}</span>
              </p>
            </GlassCard>
          </Link>
        ))}
      </div>

      {suppliers && suppliers.length === 0 && (
        <p className="text-sm text-gray-400">لا يوجد موردون بعد.</p>
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
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-glass-border bg-space-900 px-3 py-2 text-white outline-none focus:border-indigo-400"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-300">
          الهاتف
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-lg border border-glass-border bg-space-900 px-3 py-2 text-white outline-none focus:border-indigo-400"
          />
        </label>
        <Button type="submit" disabled={createSupplier.isPending}>
          حفظ
        </Button>
        {createSupplier.error && <ErrorBanner message="تعذّر إنشاء المورد" />}
      </form>
    </GlassCard>
  )
}
