import { supabase } from '../../lib/supabaseClient'

export type ExpenseSource = 'cash_drawer' | 'accumulated_cash'

export interface RecordExpenseInput {
  amount: number
  source: ExpenseSource
  note: string | null
}

export async function recordExpense(input: RecordExpenseInput, actorId: string): Promise<string> {
  const { data, error } = await supabase.rpc('record_expense', {
    p_amount: input.amount,
    p_source: input.source,
    p_actor: actorId,
    p_note: input.note ?? undefined,
  })
  if (error) throw error
  return data
}
