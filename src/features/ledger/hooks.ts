import { useQuery } from '@tanstack/react-query'
import { getLedgerBalance, listTransactions } from './queries'

export const ledgerKeys = {
  transactions: ['ledger', 'transactions'] as const,
  balance: ['ledger', 'balance'] as const,
}

export function useTransactions() {
  return useQuery({ queryKey: ledgerKeys.transactions, queryFn: listTransactions })
}

export function useLedgerBalance() {
  return useQuery({ queryKey: ledgerKeys.balance, queryFn: getLedgerBalance })
}
