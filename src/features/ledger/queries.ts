import { supabase } from '../../lib/supabaseClient'
import type { Transaction } from '../../types/domain'

export type TransactionWithSupplier = Transaction & {
  supplier: { id: string; name: string } | null
}

export async function listTransactions(): Promise<TransactionWithSupplier[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, supplier:suppliers(id, name)')
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

export interface LedgerBalance {
  totalDebit: number
  totalCredit: number
}

export async function listTransactionsBySupplier(
  supplierId: string,
): Promise<TransactionWithSupplier[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, supplier:suppliers(id, name)')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getLedgerBalance(): Promise<LedgerBalance> {
  const { data, error } = await supabase.from('ledger_entries').select('debit, credit')
  if (error) throw error
  return (data ?? []).reduce(
    (acc, row) => ({
      totalDebit: acc.totalDebit + row.debit,
      totalCredit: acc.totalCredit + row.credit,
    }),
    { totalDebit: 0, totalCredit: 0 },
  )
}
