import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listLoans, recordBankLoan, recordLoanPayment, type LoanPaymentSource } from './queries'
import { dashboardKeys } from '../dashboard/hooks'
import { ledgerKeys } from '../ledger/hooks'

export const loansKeys = {
  all: ['loans'] as const,
}

export function useLoans() {
  return useQuery({ queryKey: loansKeys.all, queryFn: listLoans })
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: loansKeys.all })
  queryClient.invalidateQueries({ queryKey: dashboardKeys.accounts })
  queryClient.invalidateQueries({ queryKey: ledgerKeys.transactions })
  queryClient.invalidateQueries({ queryKey: ledgerKeys.balance })
}

export function useRecordBankLoan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ party, amount, note }: { party: string; amount: number; note: string | null }) =>
      recordBankLoan(party, amount, note),
    onSuccess: () => invalidateAll(queryClient),
  })
}

export function useRecordLoanPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      loanId,
      amount,
      source,
      note,
    }: {
      loanId: string
      amount: number
      source: LoanPaymentSource
      note: string | null
    }) => recordLoanPayment(loanId, amount, source, note),
    onSuccess: () => invalidateAll(queryClient),
  })
}
