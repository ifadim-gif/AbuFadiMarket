import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createInvoice, getInvoice, listInvoicesBySupplier, updateInvoice } from './queries'
import type { InvoiceInput } from './queries'
import { suppliersKeys } from '../suppliers/hooks'

export const invoicesKeys = {
  bySupplier: (supplierId: string) => ['invoices', 'supplier', supplierId] as const,
  detail: (id: string) => ['invoices', id] as const,
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
