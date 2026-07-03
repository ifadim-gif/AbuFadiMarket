import { supabase } from '../../lib/supabaseClient'

export async function payToSupplier(input: {
  supplierId: string
  cash: number
  drawer: number
  checkIds: string[]
  actorId: string
}): Promise<string> {
  const { data, error } = await supabase.rpc('pay_supplier', {
    p_supplier: input.supplierId,
    p_cash: input.cash,
    p_drawer: input.drawer,
    p_check_ids: input.checkIds,
    p_actor: input.actorId,
  })
  if (error) throw error
  return data
}

export async function skimDrawer(input: { amount: number; actorId: string }): Promise<string> {
  const { data, error } = await supabase.rpc('skim_drawer', {
    p_amount: input.amount,
    p_actor: input.actorId,
  })
  if (error) throw error
  return data
}

export async function bounceCheck(input: { checkId: string; actorId: string }): Promise<string> {
  const { data, error } = await supabase.rpc('bounce_check', {
    p_check_id: input.checkId,
    p_actor: input.actorId,
  })
  if (error) throw error
  return data
}

export async function reverseTransaction(input: {
  transactionId: string
  actorId: string
}): Promise<string> {
  const { data, error } = await supabase.rpc('reverse_transaction', {
    p_transaction_id: input.transactionId,
    p_actor: input.actorId,
  })
  if (error) throw error
  return data
}
