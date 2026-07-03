import { useQuery } from '@tanstack/react-query'
import { projectCashFlow } from './queries'

export const nebulaKeys = {
  projection: (horizonDays: number) => ['nebula', 'projection', horizonDays] as const,
}

export function useCashFlowProjection(horizonDays = 30) {
  return useQuery({
    queryKey: nebulaKeys.projection(horizonDays),
    queryFn: () => projectCashFlow(horizonDays),
  })
}
