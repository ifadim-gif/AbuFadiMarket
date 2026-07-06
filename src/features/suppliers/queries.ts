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

export interface SupplierDetailsInput {
  name: string
  name_he: string | null
  phone: string | null
  category_id: string | null
  notes: string | null
}

export async function updateSupplierDetails(
  id: string,
  input: SupplierDetailsInput,
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

export interface SupplierImageRow {
  id: string
  supplier_id: string
  image_url: string
  sort_order: number
  created_at: string | null
}

export async function listSupplierImages(supplierId: string): Promise<SupplierImageRow[]> {
  const { data, error } = await supabase
    .from('supplier_images')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function uploadSupplierImage(
  supplierId: string,
  file: File,
  sortOrder: number,
  actorId: string,
): Promise<SupplierImageRow> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${supplierId}/${crypto.randomUUID()}.${ext}`
  const { error: uploadError } = await supabase.storage.from('supplier-photos').upload(path, file)
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('supplier_images')
    .insert({ supplier_id: supplierId, image_url: path, sort_order: sortOrder, created_by: actorId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getSupplierImageSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('supplier-photos').createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

export async function deleteSupplierImage(id: string, path: string): Promise<void> {
  await supabase.storage.from('supplier-photos').remove([path])
  const { error } = await supabase.from('supplier_images').delete().eq('id', id)
  if (error) throw error
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
