import { supabase } from '../../lib/supabaseClient'
import type { Supplier } from '../../types/domain'

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
