import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createObligation, listObligations, toggleObligationSettled } from './queries'
import type { ObligationInput } from './queries'

export const obligationsKeys = {
  all: ['obligations'] as const,
}

export function useObligations() {
  return useQuery({ queryKey: obligationsKeys.all, queryFn: listObligations })
}

export function useCreateObligation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ input, actorId }: { input: ObligationInput; actorId: string }) =>
      createObligation(input, actorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: obligationsKeys.all }),
  })
}

export function useToggleObligationSettled() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isSettled }: { id: string; isSettled: boolean }) =>
      toggleObligationSettled(id, isSettled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: obligationsKeys.all }),
  })
}
