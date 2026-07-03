import { supabase } from '../../lib/supabaseClient'
import type { ExpectedObligation } from '../../types/domain'

export async function listObligations(): Promise<ExpectedObligation[]> {
  const { data, error } = await supabase
    .from('expected_obligations')
    .select('*')
    .order('expected_date', { ascending: true })
  if (error) throw error
  return data
}

export interface ObligationInput {
  amount: number
  expected_date: string
  category: string | null
  note: string | null
}

export async function createObligation(
  input: ObligationInput,
  actorId: string,
): Promise<ExpectedObligation> {
  const { data, error } = await supabase
    .from('expected_obligations')
    .insert({ ...input, created_by: actorId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function toggleObligationSettled(
  id: string,
  isSettled: boolean,
): Promise<ExpectedObligation> {
  const { data, error } = await supabase
    .from('expected_obligations')
    .update({ is_settled: isSettled })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
