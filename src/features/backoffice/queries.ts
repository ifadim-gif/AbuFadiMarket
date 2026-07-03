import { supabase } from '../../lib/supabaseClient'

export async function depositCheck(checkId: string, actorId: string): Promise<string> {
  const { data, error } = await supabase.rpc('deposit_check', { p_check_id: checkId, p_actor: actorId })
  if (error) throw error
  return data
}

export async function clearCheck(checkId: string, actorId: string): Promise<string> {
  const { data, error } = await supabase.rpc('clear_check', { p_check_id: checkId, p_actor: actorId })
  if (error) throw error
  return data
}

export async function collectCardClearing(amount: number, actorId: string): Promise<string> {
  const { data, error } = await supabase.rpc('collect_card_clearing', { p_amount: amount, p_actor: actorId })
  if (error) throw error
  return data
}

export async function settleReceivableTransfer(amount: number, actorId: string): Promise<string> {
  const { data, error } = await supabase.rpc('settle_receivable_transfer', {
    p_amount: amount,
    p_actor: actorId,
  })
  if (error) throw error
  return data
}
