import { supabase } from '../../lib/supabaseClient'
import type { Invoice } from '../../types/domain'

export async function listInvoicesBySupplier(supplierId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('supplier_id', supplierId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getInvoice(id: string): Promise<Invoice> {
  const { data, error } = await supabase.from('invoices').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export interface InvoiceInput {
  supplier_id: string
  paper_no: string
  amount: number
  due_date: string | null
}

export async function createInvoice(input: InvoiceInput, actorId: string): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .insert({ ...input, created_by: actorId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateInvoice(id: string, input: InvoiceInput): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export interface OrderInvoiceInput {
  supplier_id: string
  amount: number
  due_date: string | null
}

/**
 * طلبية بدون فاتورة ورقية = فاتورة حقيقية دون رقم؛ يملأ محفّز القاعدة الرقم
 * تلقائيًا (NO-#####) فيُرحَّل الدَّين عبر نفس محفّز book_invoice_debt كأي فاتورة.
 * متّصلة إلزاميًا: توليد الرقم التسلسلي العام يحتاج القاعدة (لا التقاط دون اتصال).
 */
export async function createOrderInvoice(
  input: OrderInvoiceInput,
  actorId: string,
): Promise<Invoice> {
  const { data, error } = await supabase
    .from('invoices')
    .insert({
      supplier_id: input.supplier_id,
      amount: input.amount,
      due_date: input.due_date,
      created_by: actorId,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export interface InvoiceImageRow {
  id: string
  invoice_id: string
  image_url: string
  sort_order: number
  created_at: string | null
}

export async function listInvoiceImages(invoiceId: string): Promise<InvoiceImageRow[]> {
  const { data, error } = await supabase
    .from('invoice_images')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function uploadInvoiceImage(
  invoiceId: string,
  file: File,
  sortOrder: number,
  actorId: string,
): Promise<InvoiceImageRow> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${invoiceId}/${crypto.randomUUID()}.${ext}`
  const { error: uploadError } = await supabase.storage.from('invoice-photos').upload(path, file)
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('invoice_images')
    .insert({ invoice_id: invoiceId, image_url: path, sort_order: sortOrder, created_by: actorId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getInvoiceImageSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('invoice-photos').createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

export async function deleteInvoiceImage(id: string, path: string): Promise<void> {
  await supabase.storage.from('invoice-photos').remove([path])
  const { error } = await supabase.from('invoice_images').delete().eq('id', id)
  if (error) throw error
}

export function isDuplicatePaperNoError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  )
}
