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

export function isDuplicatePaperNoError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  )
}
