import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCheck, getCheck, listChecks } from './queries'
import type { CreateCheckInput } from './queries'
import type { CheckStatus } from '../../types/domain'
import { dashboardKeys } from '../dashboard/hooks'

export const checksKeys = {
  all: ['checks'] as const,
  list: (status?: CheckStatus) => ['checks', status ?? 'all'] as const,
  detail: (id: string) => ['checks', id] as const,
}

export function useChecks(status?: CheckStatus) {
  return useQuery({ queryKey: checksKeys.list(status), queryFn: () => listChecks(status) })
}

// شيكات في المحفظة (available) اقترب أو تجاوز تاريخ صرفها ولم يُتصرَّف بها.
export function useChecksDueSoon(withinDays = 7) {
  const { data } = useChecks('available')
  const threshold = new Date()
  threshold.setDate(threshold.getDate() + withinDays)
  const dueSoon = (data ?? []).filter(
    (c) => c.due_date != null && new Date(c.due_date) <= threshold,
  )
  return dueSoon
}

export function useCheck(id: string) {
  return useQuery({ queryKey: checksKeys.detail(id), queryFn: () => getCheck(id) })
}

export function useCreateCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { input: CreateCheckInput; actorId: string }) =>
      createCheck(vars.input, vars.actorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checksKeys.all })
      queryClient.invalidateQueries({ queryKey: dashboardKeys.accounts })
    },
  })
}
