import { useQuery } from '@tanstack/react-query'
import { getLedgerBalance, listTransactions, listTransactionsBySupplier } from './queries'

export const ledgerKeys = {
  transactions: ['ledger', 'transactions'] as const,
  bySupplier: (supplierId: string) => ['ledger', 'transactions', 'supplier', supplierId] as const,
  balance: ['ledger', 'balance'] as const,
}

export function useTransactions() {
  return useQuery({ queryKey: ledgerKeys.transactions, queryFn: listTransactions })
}

export function useTransactionsBySupplier(supplierId: string) {
  return useQuery({
    queryKey: ledgerKeys.bySupplier(supplierId),
    queryFn: () => listTransactionsBySupplier(supplierId),
    enabled: !!supplierId,
  })
}

export function useLedgerBalance() {
  return useQuery({ queryKey: ledgerKeys.balance, queryFn: getLedgerBalance })
}
