import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { captureInvoice, drainOutbox } from './queries'
import type { InvoiceInput } from '../invoices/queries'
import { invoicesKeys } from '../invoices/hooks'
import { suppliersKeys } from '../suppliers/hooks'
import { getOutbox, deleteOutboxItem } from '../../lib/outbox'

export const outboxKeys = {
  all: ['outbox'] as const,
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

export function useOutbox() {
  return useQuery({ queryKey: outboxKeys.all, queryFn: getOutbox })
}

export function useCaptureInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ input, actorId }: { input: InvoiceInput; actorId: string }) =>
      captureInvoice(input, actorId),
    onSuccess: (_result, { input }) => {
      queryClient.invalidateQueries({ queryKey: outboxKeys.all })
      queryClient.invalidateQueries({ queryKey: invoicesKeys.bySupplier(input.supplier_id) })
      queryClient.invalidateQueries({ queryKey: suppliersKeys.all })
    },
  })
}

export function useDiscardOutboxItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteOutboxItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: outboxKeys.all }),
  })
}

/** يُصرّف الصندوق عند الإقلاع وعند عودة الشبكة، ويُحدِّث الاستعلامات المتأثرة. */
export function useOutboxSync() {
  const queryClient = useQueryClient()
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const changed = await drainOutbox()
      if (changed && !cancelled) {
        queryClient.invalidateQueries({ queryKey: outboxKeys.all })
        queryClient.invalidateQueries({ queryKey: ['invoices'] })
        queryClient.invalidateQueries({ queryKey: suppliersKeys.all })
      }
    }
    run()
    window.addEventListener('online', run)
    return () => {
      cancelled = true
      window.removeEventListener('online', run)
    }
  }, [queryClient])
}
