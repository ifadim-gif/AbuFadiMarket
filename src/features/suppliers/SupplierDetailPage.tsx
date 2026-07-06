import { Link, useParams } from 'react-router-dom'
import { GlassCard } from '../../components/ui/GlassCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { BackLink } from '../../components/ui/BackLink'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useHasCapability } from '../auth/useHasCapability'
import { useSupplier } from './hooks'
import { useInvoicesBySupplier } from '../invoices/hooks'
import { VisitScheduleEditor } from './VisitScheduleEditor'

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: supplier, isLoading, error } = useSupplier(id!)
  const { data: invoices, isLoading: loadingInvoices } = useInvoicesBySupplier(id!)
  const canManage = useHasCapability('manage_finance')
  const canCapture = useHasCapability('capture_documents')

  if (isLoading) return <LoadingSpinner label="جارٍ تحميل بيانات المورد..." />
  if (error || !supplier) return <ErrorBanner message="تعذّر تحميل بيانات المورد" />

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/suppliers" label="الموردون" />
      <GlassCard>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">{supplier.name}</h1>
            <p className="mt-1 text-xs text-gray-500">رقم المورد: {supplier.supplier_no}</p>
            {supplier.phone && <p className="mt-1 text-sm text-gray-400">{supplier.phone}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            {supplier.red_flag && <Badge variant="danger">علامة حمراء</Badge>}
            {supplier.orders_blocked && <Badge variant="warn">الطلبية محظورة</Badge>}
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-300">
          الرصيد الحالي: <span className="font-mono">{supplier.balance.toFixed(2)}</span>
        </p>
        <p className="mt-1 text-sm text-gray-300">مؤشر المخاطر: {supplier.risk_score}</p>
        {supplier.red_flag && supplier.red_flag_note && (
          <p className="mt-2 text-sm text-status-danger">{supplier.red_flag_note}</p>
        )}
        {canManage && (
          <Link to={`/suppliers/${supplier.id}/pay`} className="mt-4 inline-block">
            <Button>سداد</Button>
          </Link>
        )}
      </GlassCard>

      {canManage && (
        <GlassCard>
          <h2 className="mb-3 font-semibold text-white">أيام الزيارة</h2>
          <VisitScheduleEditor supplier={supplier} />
        </GlassCard>
      )}

      <GlassCard>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">الفواتير</h2>
          {canCapture && (
            <Link to={`/invoices/new?supplier=${supplier.id}`}>
              <Button>فاتورة جديدة</Button>
            </Link>
          )}
        </div>

        {loadingInvoices && <LoadingSpinner label="جارٍ تحميل الفواتير..." />}

        <div className="mt-3 flex flex-col divide-y divide-glass-border">
          {invoices?.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <span className="font-mono text-gray-200">{inv.paper_no}</span>
                {inv.due_date && (
                  <span className="ms-2 text-gray-500">استحقاق {inv.due_date}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-300">
                  {inv.amount.toFixed(2)} / متبقٍ {(inv.remaining ?? 0).toFixed(2)}
                </span>
                {canManage && (
                  <Link to={`/invoices/${inv.id}/edit`} className="text-brand-red-light hover:underline">
                    تعديل
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {invoices && invoices.length === 0 && (
          <p className="mt-2 text-sm text-gray-400">لا توجد فواتير لهذا المورد بعد.</p>
        )}
      </GlassCard>
    </div>
  )
}
