import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  bulkCreateSuppliers,
  createSupplier,
  getSupplier,
  listSuppliers,
  updateSupplierVisitSchedule,
} from './queries'
import type { BulkSupplierRow, CreateSupplierInput, VisitScheduleInput } from './queries'

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

export function useUpdateSupplierVisitSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: VisitScheduleInput }) =>
      updateSupplierVisitSchedule(id, input),
    onSuccess: (supplier) => {
      queryClient.invalidateQueries({ queryKey: suppliersKeys.all })
      queryClient.invalidateQueries({ queryKey: suppliersKeys.detail(supplier.id) })
    },
  })
}

export function useBulkCreateSuppliers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rows: BulkSupplierRow[]) => bulkCreateSuppliers(rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suppliersKeys.all })
    },
  })
}
