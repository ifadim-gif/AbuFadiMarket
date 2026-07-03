import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { closeDailyOrbit, getDrawerAccount, getTodaysClose, listDailyCloses } from './queries'
import { dashboardKeys } from '../dashboard/hooks'
import { ledgerKeys } from '../ledger/hooks'

export const dailyCloseKeys = {
  today: ['dailyClose', 'today'] as const,
  list: ['dailyClose', 'list'] as const,
  drawer: ['dailyClose', 'drawer'] as const,
}

export function useTodaysClose() {
  return useQuery({ queryKey: dailyCloseKeys.today, queryFn: getTodaysClose })
}

export function useDrawerAccount() {
  return useQuery({ queryKey: dailyCloseKeys.drawer, queryFn: getDrawerAccount })
}

export function useDailyCloses() {
  return useQuery({ queryKey: dailyCloseKeys.list, queryFn: listDailyCloses })
}

export function useCloseDailyOrbit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: closeDailyOrbit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dailyCloseKeys.today })
      queryClient.invalidateQueries({ queryKey: dailyCloseKeys.list })
      queryClient.invalidateQueries({ queryKey: dailyCloseKeys.drawer })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.accounts })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.stats })
      queryClient.invalidateQueries({ queryKey: ledgerKeys.transactions })
      queryClient.invalidateQueries({ queryKey: ledgerKeys.balance })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}
