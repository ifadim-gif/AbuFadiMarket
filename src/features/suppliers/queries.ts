import { supabase } from '../../lib/supabaseClient'
import type { Supplier, VisitPattern } from '../../types/domain'

export async function listSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getSupplier(id: string): Promise<Supplier> {
  const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export interface CreateSupplierInput {
  name: string
  name_he: string | null
  phone: string | null
  visit_days: number[] | null
}

export async function createSupplier(input: CreateSupplierInput): Promise<Supplier> {
  const { data, error } = await supabase.from('suppliers').insert(input).select().single()
  if (error) throw error
  return data
}

export interface VisitScheduleInput {
  visit_pattern: VisitPattern
  visit_days: number[] | null
  visit_day_of_month: number | null
  orders_blocked: boolean
}

export async function updateSupplierVisitSchedule(
  id: string,
  input: VisitScheduleInput,
): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export interface BulkSupplierRow {
  supplier_no?: number
  name: string
  name_he: string | null
  phone: string | null
  visit_days: number[] | null
  orders_blocked: boolean
  category_id: string | null
}

// يُقسَّم لدفعتين متجانستَي المفاتيح: PostgREST يبني قائمة أعمدة الإدراج الجماعي من
// اتحاد مفاتيح كل الصفوف، فوجود صفّ برقم تعريف صريح إلى جانب صفّ بلا رقم (المفتاح
// موجود بقيمة undefined) يجعله يُرسِل NULL صراحةً للصفّ الثاني بدل حذف العمود —
// فيصطدم بقيد NOT NULL على supplier_no بدل استخدام DEFAULT التسلسلي.
export async function bulkCreateSuppliers(rows: BulkSupplierRow[]): Promise<void> {
  const withNo = rows.filter((r) => r.supplier_no !== undefined)
  const withoutNo = rows
    .filter((r) => r.supplier_no === undefined)
    .map(({ supplier_no: _supplier_no, ...rest }) => rest)

  if (withoutNo.length > 0) {
    const { error } = await supabase.from('suppliers').insert(withoutNo)
    if (error) throw error
  }
  if (withNo.length > 0) {
    const { error } = await supabase.from('suppliers').insert(withNo)
    if (error) throw error
  }
}
