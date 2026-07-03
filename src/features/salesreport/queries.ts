import { supabase } from '../../lib/supabaseClient'
import type { Database } from '../../types/database.types'

export type DailySalesReport = Database['public']['Tables']['daily_sales_reports']['Row']

export interface DailySalesInput {
  work_date: string
  cash_sales: number
  card_sales: number
  check_sales: number
  credit_invoice: number
  credit_delivery: number
  recv_cash: number
  recv_check: number
  recv_card: number
}

export async function recordDailySales(input: DailySalesInput, actorId: string): Promise<string> {
  const { data, error } = await supabase.rpc('record_daily_sales', {
    p_work_date: input.work_date,
    p_cash_sales: input.cash_sales,
    p_card_sales: input.card_sales,
    p_check_sales: input.check_sales,
    p_credit_invoice: input.credit_invoice,
    p_credit_delivery: input.credit_delivery,
    p_recv_cash: input.recv_cash,
    p_recv_check: input.recv_check,
    p_recv_card: input.recv_card,
    p_actor: actorId,
  })
  if (error) throw error
  return data
}

export async function listDailySalesReports(): Promise<DailySalesReport[]> {
  const { data, error } = await supabase
    .from('daily_sales_reports')
    .select('*')
    .order('work_date', { ascending: false })
    .limit(30)
  if (error) throw error
  return data
}
