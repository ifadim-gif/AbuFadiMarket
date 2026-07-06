import { supabase } from '../../lib/supabaseClient'

export type LoanPaymentSource = 'bank' | 'accumulated_cash'

export interface LoanRow {
  id: string
  party_name: string
  principal: number
  note: string | null
  created_at: string | null
  paid: number
  remaining: number
}

export async function listLoans(): Promise<LoanRow[]> {
  const { data: loans, error } = await supabase
    .from('bank_loans')
    .select('id, party_name, principal, note, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error

  const { data: payments, error: payErr } = await supabase
    .from('transactions')
    .select('loan_id, total')
    .eq('type', 'loan_payment')
  if (payErr) throw payErr

  const paidByLoan = new Map<string, number>()
  for (const p of payments) {
    if (!p.loan_id) continue
    paidByLoan.set(p.loan_id, (paidByLoan.get(p.loan_id) ?? 0) + p.total)
  }

  return loans.map((l) => {
    const paid = paidByLoan.get(l.id) ?? 0
    return { ...l, paid, remaining: l.principal - paid }
  })
}

export async function recordBankLoan(party: string, amount: number, note: string | null): Promise<string> {
  const { data, error } = await supabase.rpc('record_bank_loan', {
    p_party: party,
    p_amount: amount,
    p_note: note ?? undefined,
  })
  if (error) throw error
  return data as string
}

export async function recordLoanPayment(
  loanId: string,
  amount: number,
  source: LoanPaymentSource,
  note: string | null,
): Promise<string> {
  const { data, error } = await supabase.rpc('record_loan_payment', {
    p_loan_id: loanId,
    p_amount: amount,
    p_source: source,
    p_note: note ?? undefined,
  })
  if (error) throw error
  return data as string
}
