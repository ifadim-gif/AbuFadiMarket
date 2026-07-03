import { supabase } from '../../lib/supabaseClient'
import type { CashFlowDay } from '../../types/domain'

export async function projectCashFlow(horizonDays = 30): Promise<CashFlowDay[]> {
  const { data, error } = await supabase.rpc('project_cash_flow', { p_horizon_days: horizonDays })
  if (error) throw error
  return data
}
