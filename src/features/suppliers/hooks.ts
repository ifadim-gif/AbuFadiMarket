import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  bulkCreateSuppliers,
  createSupplier,
  deleteSupplierImage,
  getSupplier,
  listSupplierImages,
  listSuppliers,
  updateSupplierDetails,
  updateSupplierVisitSchedule,
  uploadSupplierImage,
} from './queries'
import type {
  BulkSupplierRow,
  CreateSupplierInput,
  SupplierDetailsInput,
  VisitScheduleInput,
} from './queries'

export const suppliersKeys = {
  all: ['suppliers'] as const,
  detail: (id: string) => ['suppliers', id] as const,
  images: (id: string) => ['suppliers', id, 'images'] as const,
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

export function useUpdateSupplierDetails() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SupplierDetailsInput }) =>
      updateSupplierDetails(id, input),
    onSuccess: (supplier) => {
      queryClient.invalidateQueries({ queryKey: suppliersKeys.all })
      queryClient.invalidateQueries({ queryKey: suppliersKeys.detail(supplier.id) })
    },
  })
}

export function useSupplierImages(supplierId: string) {
  return useQuery({
    queryKey: suppliersKeys.images(supplierId),
    queryFn: () => listSupplierImages(supplierId),
    enabled: !!supplierId,
  })
}

export function useUploadSupplierImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      supplierId,
      file,
      sortOrder,
      actorId,
    }: {
      supplierId: string
      file: File
      sortOrder: number
      actorId: string
    }) => uploadSupplierImage(supplierId, file, sortOrder, actorId),
    onSuccess: (image) => {
      queryClient.invalidateQueries({ queryKey: suppliersKeys.images(image.supplier_id) })
    },
  })
}

export function useDeleteSupplierImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, supplierId, path }: { id: string; supplierId: string; path: string }) =>
      deleteSupplierImage(id, path).then(() => supplierId),
    onSuccess: (supplierId) => {
      queryClient.invalidateQueries({ queryKey: suppliersKeys.images(supplierId) })
    },
  })
}
