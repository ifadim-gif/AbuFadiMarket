import { useRef, useState, type ChangeEvent } from 'react'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import { Button } from '../../components/ui/Button'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useBulkCreateSuppliers } from './hooks'
import { dayLabels } from './visitSchedule'
import type { BulkSupplierRow } from './queries'

const truthyValues = new Set(['1', 'true', 'نعم', 'yes', 'y'])

function parseVisitDays(raw: unknown): number[] | null {
  if (raw === undefined || raw === null || raw === '') return null
  const parts = String(raw)
    .split(/[,\/،]/)
    .map((p) => p.trim())
    .filter(Boolean)
  const days = parts
    .map((p) => {
      const asNum = Number(p)
      if (!Number.isNaN(asNum) && asNum >= 0 && asNum <= 6) return asNum
      const idx = dayLabels.findIndex((label) => label === p)
      return idx >= 0 ? idx : null
    })
    .filter((d): d is number => d !== null)
  return days.length > 0 ? days : null
}

function readCell(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    for (const rowKey of Object.keys(row)) {
      if (rowKey.trim().toLowerCase() === key.toLowerCase()) return row[rowKey]
    }
  }
  return undefined
}

export function SupplierExcelImport({ onDone }: { onDone: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<BulkSupplierRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const bulkCreate = useBulkCreateSuppliers()

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

      const parsed: BulkSupplierRow[] = []
      for (const r of raw) {
        const name = readCell(r, ['الاسم', 'اسم المورد', 'name'])
        if (!name) continue
        const supplierNoRaw = readCell(r, ['رقم التعريف', 'الرقم التعريفي', 'supplier_no', 'id'])
        const phone = readCell(r, ['الهاتف', 'رقم الهاتف', 'phone'])
        const visitDaysRaw = readCell(r, ['أيام الزيارة', 'ايام الزيارة', 'visit_days'])
        const blockedRaw = readCell(r, ['حظر الطلبية', 'orders_blocked'])

        parsed.push({
          supplier_no: supplierNoRaw ? Number(supplierNoRaw) : undefined,
          name: String(name),
          phone: phone ? String(phone) : null,
          visit_days: parseVisitDays(visitDaysRaw),
          orders_blocked: truthyValues.has(String(blockedRaw ?? '').trim().toLowerCase()),
        })
      }

      if (parsed.length === 0) {
        setError('لم يُعثر على أي صف يحوي اسم مورد صالح في الملف')
        return
      }
      setRows(parsed)
    } catch {
      setError('تعذّر قراءة الملف — تأكّد أنه بصيغة xlsx/xls/csv صحيحة')
    }
  }

  async function confirmImport() {
    if (!rows) return
    try {
      await bulkCreate.mutateAsync(rows)
      await Swal.fire({
        icon: 'success',
        title: `تم استيراد ${rows.length} موردًا`,
        confirmButtonText: 'حسنًا',
      })
      onDone()
    } catch {
      setError('تعذّر استيراد بعض/كل الصفوف — تحقّق من عدم تكرار رقم التعريف')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-500">
        الأعمدة المتوقعة: رقم التعريف (اختياري)، الاسم، الهاتف، أيام الزيارة (مثال: الأحد،الثلاثاء أو
        0،2)، حظر الطلبية (نعم/لا).
      </p>
      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFile}
      />
      <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}>
        اختيار ملف إكسل
      </Button>
      {error && <ErrorBanner message={error} />}
      {rows && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-300">تم العثور على {rows.length} مورد جاهز للاستيراد.</p>
          <Button type="button" onClick={confirmImport} disabled={bulkCreate.isPending}>
            {bulkCreate.isPending ? 'جارٍ الاستيراد...' : 'تأكيد الاستيراد'}
          </Button>
        </div>
      )}
    </div>
  )
}
