import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setOpeningBalance } from './queries'
import { dashboardKeys } from '../dashboard/hooks'
import { ledgerKeys } from '../ledger/hooks'

export function useSetOpeningBalance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { code: string; amount: number }) =>
      setOpeningBalance(vars.code, vars.amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.accounts })
      queryClient.invalidateQueries({ queryKey: ledgerKeys.transactions })
      queryClient.invalidateQueries({ queryKey: ledgerKeys.balance })
    },
  })
}
