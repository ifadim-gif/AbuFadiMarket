import { supabase } from '../../lib/supabaseClient'

// الحاويات القابلة للضبط الافتتاحي + مسمّياتها العربية.
export const OPENING_ACCOUNTS: { code: string; label: string }[] = [
  { code: 'cash_drawer', label: 'درج النقد' },
  { code: 'accumulated_cash', label: 'النقد المتراكم' },
  { code: 'bank', label: 'البنك' },
  { code: 'checks_on_hand', label: 'الشيكات بحوزتنا' },
  { code: 'customer_receivable', label: 'ذمم العملاء' },
  { code: 'suppliers_payable', label: 'ذمم الموردين' },
]

export async function setOpeningBalance(code: string, amount: number): Promise<string | null> {
  const { data, error } = await supabase.rpc('set_opening_balance', {
    p_code: code,
    p_amount: amount,
  })
  if (error) throw error
  return data
}
