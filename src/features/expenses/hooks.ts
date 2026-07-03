import { useMutation, useQueryClient } from '@tanstack/react-query'
import { recordExpense } from './queries'
import type { RecordExpenseInput } from './queries'
import { dashboardKeys } from '../dashboard/hooks'
import { ledgerKeys } from '../ledger/hooks'

export function useRecordExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { input: RecordExpenseInput; actorId: string }) =>
      recordExpense(vars.input, vars.actorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.accounts })
      queryClient.invalidateQueries({ queryKey: ledgerKeys.transactions })
      queryClient.invalidateQueries({ queryKey: ledgerKeys.balance })
    },
  })
}
