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
  phone: string | null
  visit_days: number[] | null
  orders_blocked: boolean
}

export async function bulkCreateSuppliers(rows: BulkSupplierRow[]): Promise<void> {
  const { error } = await supabase.from('suppliers').insert(rows)
  if (error) throw error
}
