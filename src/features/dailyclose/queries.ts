import { supabase } from '../../lib/supabaseClient'
import type { Account, DailyClose } from '../../types/domain'

export async function getTodaysClose(): Promise<DailyClose | null> {
  const today = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('daily_closes')
    .select('*')
    .eq('close_date', today)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getDrawerAccount(): Promise<Account> {
  const { data, error } = await supabase.from('accounts').select('*').eq('code', 'cash_drawer').single()
  if (error) throw error
  return data
}

export async function listDailyCloses(): Promise<DailyClose[]> {
  const { data, error } = await supabase
    .from('daily_closes')
    .select('*')
    .order('close_date', { ascending: false })
    .limit(30)
  if (error) throw error
  return data
}

export async function closeDailyOrbit(input: {
  counted: number
  actorId: string
  workDate?: string
  newFloat?: number
}): Promise<string> {
  const { data, error } = await supabase.rpc('close_daily_orbit', {
    p_counted: input.counted,
    p_actor: input.actorId,
    p_work_date: input.workDate,
    p_new_float: input.newFloat,
  })
  if (error) throw error
  return data
}
