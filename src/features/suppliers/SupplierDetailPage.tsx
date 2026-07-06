import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GlassCard } from '../../components/ui/GlassCard'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { BackLink } from '../../components/ui/BackLink'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useAuth } from '../auth/useAuth'
import { useHasCapability } from '../auth/useHasCapability'
import { useSupplier } from './hooks'
import { useCategories } from '../categories/hooks'
import { useInvoicesBySupplier } from '../invoices/hooks'
import { useTransactionsBySupplier } from '../ledger/hooks'
import { VisitScheduleEditor } from './VisitScheduleEditor'
import { SupplierEditForm } from './SupplierEditForm'
import { SupplierPhotoCapture } from './SupplierPhotoCapture'
import { SupplierPurchaseSummary } from './SupplierPurchaseSummary'

const typeLabels: Record<string, string> = {
  payment: 'سداد',
  expense: 'مصروف',
  sales_skim: 'إفراغ درج',
  liquidity_transfer: 'تحويل سيولة',
  reversal: 'تراجع/تصحيح',
  sale: 'بيع',
  receivable_settlement: 'تحصيل ذمّة',
  purchase: 'شراء (فاتورة)',
  opening_balance: 'رصيد افتتاحي',
  loan_received: 'قرض مستلَم',
  loan_payment: 'سداد قسط قرض',
}

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const { data: supplier, isLoading, error } = useSupplier(id!)
  const { data: invoices, isLoading: loadingInvoices } = useInvoicesBySupplier(id!)
  const { data: transactions, isLoading: loadingTxns } = useTransactionsBySupplier(id!)
  const { data: categories } = useCategories('supplier')
  const canManage = useHasCapability('manage_finance')
  const canCapture = useHasCapability('capture_documents')
  const [editing, setEditing] = useState(false)

  if (isLoading) return <LoadingSpinner label="جارٍ تحميل بيانات المورد..." />
  if (error || !supplier) return <ErrorBanner message="تعذّر تحميل بيانات المورد" />

  const categoryName = categories?.find((c) => c.id === supplier.category_id)?.name

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/suppliers" label="الموردون" />

      <GlassCard>
        {editing ? (
          <SupplierEditForm supplier={supplier} onDone={() => setEditing(false)} />
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold text-white">{supplier.name}</h1>
                {supplier.name_he && (
                  <p className="text-sm text-gray-400" dir="rtl">{supplier.name_he}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">رقم المورد: {supplier.supplier_no}</p>
                {supplier.phone && <p className="mt-1 text-sm text-gray-400">{supplier.phone}</p>}
                {categoryName && (
                  <p className="mt-1 text-sm text-gray-400">المجموعة: {categoryName}</p>
                )}
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
            {supplier.notes && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-gray-400">{supplier.notes}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {canManage && (
                <Link to={`/suppliers/${supplier.id}/pay`}>
                  <Button>سداد</Button>
                </Link>
              )}
              {canManage && (
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  تعديل بيانات المورد
                </Button>
              )}
            </div>
          </>
        )}
      </GlassCard>

      {canManage && (
        <GlassCard>
          <h2 className="mb-3 font-semibold text-white">أيام الزيارة</h2>
          <VisitScheduleEditor supplier={supplier} />
        </GlassCard>
      )}

      <GlassCard>
        <h2 className="mb-3 font-semibold text-white">صور المورد</h2>
        <SupplierPhotoCapture supplierId={supplier.id} actorId={session!.user.id} canManage={canManage} />
      </GlassCard>

      <GlassCard>
        <h2 className="mb-3 font-semibold text-white">تراكم المشتريات</h2>
        <SupplierPurchaseSummary invoices={invoices ?? []} />
      </GlassCard>

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

      <GlassCard>
        <h2 className="mb-3 font-semibold text-white">الدفعات والتسويات</h2>

        {loadingTxns && <LoadingSpinner label="جارٍ تحميل الحركات..." />}

        <div className="flex flex-col divide-y divide-glass-border">
          {transactions?.map((txn) => (
            <div key={txn.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <span className="font-medium text-white">{typeLabels[txn.type] ?? txn.type}</span>
                <p className="mt-0.5 text-xs text-gray-500">
                  {new Date(txn.created_at ?? '').toLocaleString('ar')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-gray-200">{txn.total.toFixed(2)}</span>
                {txn.reversed_by && <Badge variant="neutral">مُعاد</Badge>}
              </div>
            </div>
          ))}
        </div>

        {transactions && transactions.length === 0 && (
          <p className="mt-2 text-sm text-gray-400">لا توجد دفعات أو تسويات لهذا المورد بعد.</p>
        )}
      </GlassCard>
    </div>
  )
}
