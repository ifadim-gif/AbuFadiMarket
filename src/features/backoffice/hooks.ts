import { useMutation, useQueryClient } from '@tanstack/react-query'
import { clearCheck, collectCardClearing, depositCheck, settleReceivableTransfer } from './queries'
import { checksKeys } from '../checks/hooks'
import { dashboardKeys } from '../dashboard/hooks'
import { ledgerKeys } from '../ledger/hooks'

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: checksKeys.all })
  queryClient.invalidateQueries({ queryKey: dashboardKeys.accounts })
  queryClient.invalidateQueries({ queryKey: ledgerKeys.transactions })
  queryClient.invalidateQueries({ queryKey: ledgerKeys.balance })
}

export function useDepositCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { checkId: string; actorId: string }) => depositCheck(vars.checkId, vars.actorId),
    onSuccess: () => invalidate(queryClient),
  })
}

export function useClearCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { checkId: string; actorId: string }) => clearCheck(vars.checkId, vars.actorId),
    onSuccess: () => invalidate(queryClient),
  })
}

export function useCollectCardClearing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { amount: number; actorId: string }) => collectCardClearing(vars.amount, vars.actorId),
    onSuccess: () => invalidate(queryClient),
  })
}

export function useSettleReceivableTransfer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { amount: number; actorId: string }) =>
      settleReceivableTransfer(vars.amount, vars.actorId),
    onSuccess: () => invalidate(queryClient),
  })
}
