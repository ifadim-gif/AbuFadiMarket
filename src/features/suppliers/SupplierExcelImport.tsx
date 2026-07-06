import { useRef, useState, type ChangeEvent } from 'react'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import { Button } from '../../components/ui/Button'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { createCategory, listCategories } from '../categories/queries'
import { useBulkCreateSuppliers } from './hooks'
import { dayLabels } from './visitSchedule'
import { downloadSupplierTemplate } from './supplierTemplate'
import type { BulkSupplierRow } from './queries'

const truthyValues = new Set(['1', 'true', 'نعم', 'yes', 'y'])

interface ParsedRow {
  supplier_no?: number
  name: string
  name_he: string | null
  phone: string | null
  visit_days: number[] | null
  orders_blocked: boolean
  categoryName: string | null
}

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
  const [rows, setRows] = useState<ParsedRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
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

      const parsed: ParsedRow[] = []
      for (const r of raw) {
        const name = readCell(r, ['الاسم', 'اسم المورد', 'name'])
        if (!name) continue
        const supplierNoRaw = readCell(r, ['رقم التعريف', 'الرقم التعريفي', 'supplier_no', 'id'])
        const nameHe = readCell(r, ['الاسم العبري', 'name_he', 'hebrew name'])
        const phone = readCell(r, ['الهاتف', 'رقم الهاتف', 'phone'])
        const visitDaysRaw = readCell(r, ['أيام الزيارة', 'ايام الزيارة', 'visit_days'])
        const blockedRaw = readCell(r, ['حظر الطلبية', 'orders_blocked'])
        const categoryRaw = readCell(r, ['التصنيف', 'المجموعة', 'category'])

        parsed.push({
          supplier_no: supplierNoRaw ? Number(supplierNoRaw) : undefined,
          name: String(name),
          name_he: nameHe ? String(nameHe) : null,
          phone: phone ? String(phone) : null,
          visit_days: parseVisitDays(visitDaysRaw),
          orders_blocked: truthyValues.has(String(blockedRaw ?? '').trim().toLowerCase()),
          categoryName: categoryRaw ? String(categoryRaw).trim() : null,
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
    setError(null)
    setImporting(true)
    try {
      // تصنيفات الموردين: أي اسم تصنيف بالملف غير موجود يُنشَأ تلقائيًا (upsert بالاسم).
      const existing = await listCategories('supplier')
      const nameToId = new Map(existing.map((c) => [c.name, c.id]))
      const uniqueNames = [...new Set(rows.map((r) => r.categoryName).filter((n): n is string => !!n))]
      for (const name of uniqueNames) {
        if (!nameToId.has(name)) {
          const created = await createCategory(name, 'supplier')
          nameToId.set(name, created.id)
        }
      }

      const finalRows: BulkSupplierRow[] = rows.map((r) => ({
        supplier_no: r.supplier_no,
        name: r.name,
        name_he: r.name_he,
        phone: r.phone,
        visit_days: r.visit_days,
        orders_blocked: r.orders_blocked,
        category_id: r.categoryName ? (nameToId.get(r.categoryName) ?? null) : null,
      }))

      await bulkCreate.mutateAsync(finalRows)
      await Swal.fire({
        icon: 'success',
        title: `تم استيراد ${finalRows.length} موردًا`,
        confirmButtonText: 'حسنًا',
      })
      onDone()
    } catch {
      setError('تعذّر استيراد بعض/كل الصفوف — تحقّق من عدم تكرار رقم التعريف')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-500">
        الأعمدة المتوقعة: رقم التعريف (اختياري)، الاسم، الاسم العبري (اختياري)، الهاتف، أيام
        الزيارة (مثال: الأحد،الثلاثاء أو 0،2)، حظر الطلبية (نعم/لا)، التصنيف (اختياري — أي اسم غير
        موجود يُنشَأ تلقائيًا). حمّل القالب الجاهز لضمان التوافق.
      </p>
      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFile}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={downloadSupplierTemplate}>
          ⬇️ تحميل قالب إكسل
        </Button>
        <Button type="button" variant="secondary" onClick={() => fileInput.current?.click()}>
          اختيار ملف إكسل
        </Button>
      </div>
      {error && <ErrorBanner message={error} />}
      {rows && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-300">تم العثور على {rows.length} مورد جاهز للاستيراد.</p>
          <Button type="button" onClick={confirmImport} disabled={importing}>
            {importing ? 'جارٍ الاستيراد...' : 'تأكيد الاستيراد'}
          </Button>
        </div>
      )}
    </div>
  )
}
