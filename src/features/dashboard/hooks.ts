import { useQuery } from '@tanstack/react-query'
import { getChecksDueTimeline, getDashboardStats, getLedgerBalanceHistory, listAccounts } from './queries'

export const dashboardKeys = {
  accounts: ['accounts'] as const,
  stats: ['dashboard', 'stats'] as const,
  checksDue: ['dashboard', 'checksDue'] as const,
  ledgerHistory: ['dashboard', 'ledgerHistory'] as const,
}

export function useAccounts() {
  return useQuery({ queryKey: dashboardKeys.accounts, queryFn: listAccounts })
}

export function useDashboardStats() {
  return useQuery({ queryKey: dashboardKeys.stats, queryFn: getDashboardStats })
}

export function useChecksDueTimeline() {
  return useQuery({ queryKey: dashboardKeys.checksDue, queryFn: getChecksDueTimeline })
}

export function useLedgerBalanceHistory() {
  return useQuery({ queryKey: dashboardKeys.ledgerHistory, queryFn: getLedgerBalanceHistory })
}
