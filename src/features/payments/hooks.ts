import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bounceCheck, payToSupplier, reverseTransaction, skimDrawer } from './queries'
import { suppliersKeys } from '../suppliers/hooks'
import { invoicesKeys } from '../invoices/hooks'
import { checksKeys } from '../checks/hooks'
import { dashboardKeys } from '../dashboard/hooks'
import { ledgerKeys } from '../ledger/hooks'

function invalidateAllFinancials(queryClient: ReturnType<typeof useQueryClient>, supplierId?: string) {
  queryClient.invalidateQueries({ queryKey: suppliersKeys.all })
  if (supplierId) {
    queryClient.invalidateQueries({ queryKey: suppliersKeys.detail(supplierId) })
    queryClient.invalidateQueries({ queryKey: invoicesKeys.bySupplier(supplierId) })
  }
  queryClient.invalidateQueries({ queryKey: checksKeys.all })
  queryClient.invalidateQueries({ queryKey: dashboardKeys.accounts })
  queryClient.invalidateQueries({ queryKey: dashboardKeys.stats })
  queryClient.invalidateQueries({ queryKey: ledgerKeys.transactions })
  queryClient.invalidateQueries({ queryKey: ledgerKeys.balance })
}

export function usePaySupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: payToSupplier,
    onSuccess: (_data, variables) => invalidateAllFinancials(queryClient, variables.supplierId),
  })
}

export function useSkimDrawer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: skimDrawer,
    onSuccess: () => invalidateAllFinancials(queryClient),
  })
}

export function useBounceCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: bounceCheck,
    onSuccess: () => invalidateAllFinancials(queryClient),
  })
}

export function useReverseTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reverseTransaction,
    onSuccess: () => invalidateAllFinancials(queryClient),
  })
}
