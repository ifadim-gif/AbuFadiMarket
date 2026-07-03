import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { listDailySalesReports, recordDailySales } from './queries'
import type { DailySalesInput } from './queries'
import { dashboardKeys } from '../dashboard/hooks'
import { ledgerKeys } from '../ledger/hooks'

export const salesReportKeys = {
  all: ['daily_sales_reports'] as const,
}

export function useDailySalesReports() {
  return useQuery({ queryKey: salesReportKeys.all, queryFn: listDailySalesReports })
}

export function useRecordDailySales() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { input: DailySalesInput; actorId: string }) =>
      recordDailySales(vars.input, vars.actorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesReportKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.accounts })
      queryClient.invalidateQueries({ queryKey: ledgerKeys.transactions })
      queryClient.invalidateQueries({ queryKey: ledgerKeys.balance })
    },
  })
}
