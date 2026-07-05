import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createInvoice,
  createOrderInvoice,
  deleteInvoiceImage,
  getInvoice,
  listInvoiceImages,
  listInvoicesBySupplier,
  updateInvoice,
  uploadInvoiceImage,
} from './queries'
import type { InvoiceInput, OrderInvoiceInput } from './queries'
import { suppliersKeys } from '../suppliers/hooks'

export const invoicesKeys = {
  bySupplier: (supplierId: string) => ['invoices', 'supplier', supplierId] as const,
  detail: (id: string) => ['invoices', id] as const,
  images: (invoiceId: string) => ['invoices', invoiceId, 'images'] as const,
}

export function useInvoicesBySupplier(supplierId: string) {
  return useQuery({
    queryKey: invoicesKeys.bySupplier(supplierId),
    queryFn: () => listInvoicesBySupplier(supplierId),
  })
}

export function useInvoice(id: string) {
  return useQuery({ queryKey: invoicesKeys.detail(id), queryFn: () => getInvoice(id) })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ input, actorId }: { input: InvoiceInput; actorId: string }) =>
      createInvoice(input, actorId),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: invoicesKeys.bySupplier(invoice.supplier_id) })
      queryClient.invalidateQueries({ queryKey: suppliersKeys.all })
    },
  })
}

export function useCreateOrderInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ input, actorId }: { input: OrderInvoiceInput; actorId: string }) =>
      createOrderInvoice(input, actorId),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: invoicesKeys.bySupplier(invoice.supplier_id) })
      queryClient.invalidateQueries({ queryKey: suppliersKeys.all })
      queryClient.invalidateQueries({ queryKey: suppliersKeys.detail(invoice.supplier_id) })
    },
  })
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: InvoiceInput }) => updateInvoice(id, input),
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: invoicesKeys.bySupplier(invoice.supplier_id) })
      queryClient.invalidateQueries({ queryKey: invoicesKeys.detail(invoice.id) })
      queryClient.invalidateQueries({ queryKey: suppliersKeys.all })
    },
  })
}

export function useInvoiceImages(invoiceId: string) {
  return useQuery({
    queryKey: invoicesKeys.images(invoiceId),
    queryFn: () => listInvoiceImages(invoiceId),
    enabled: !!invoiceId,
  })
}

export function useUploadInvoiceImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      invoiceId,
      file,
      sortOrder,
      actorId,
    }: {
      invoiceId: string
      file: File
      sortOrder: number
      actorId: string
    }) => uploadInvoiceImage(invoiceId, file, sortOrder, actorId),
    onSuccess: (image) => {
      queryClient.invalidateQueries({ queryKey: invoicesKeys.images(image.invoice_id) })
    },
  })
}

export function useDeleteInvoiceImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, invoiceId, path }: { id: string; invoiceId: string; path: string }) =>
      deleteInvoiceImage(id, path).then(() => invoiceId),
    onSuccess: (invoiceId) => {
      queryClient.invalidateQueries({ queryKey: invoicesKeys.images(invoiceId) })
    },
  })
}
