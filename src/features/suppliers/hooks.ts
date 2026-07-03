import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createSupplier, getSupplier, listSuppliers } from './queries'
import type { CreateSupplierInput } from './queries'

export const suppliersKeys = {
  all: ['suppliers'] as const,
  detail: (id: string) => ['suppliers', id] as const,
}

export function useSuppliers() {
  return useQuery({ queryKey: suppliersKeys.all, queryFn: listSuppliers })
}

export function useSupplier(id: string) {
  return useQuery({ queryKey: suppliersKeys.detail(id), queryFn: () => getSupplier(id) })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSupplierInput) => createSupplier(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suppliersKeys.all })
    },
  })
}
