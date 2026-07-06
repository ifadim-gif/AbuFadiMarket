import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createCheck,
  deleteCheckImage,
  getCheck,
  listCheckImages,
  listChecks,
  uploadCheckImage,
} from './queries'
import type { CreateCheckInput } from './queries'
import type { CheckStatus } from '../../types/domain'
import { dashboardKeys } from '../dashboard/hooks'

export const checksKeys = {
  all: ['checks'] as const,
  list: (status?: CheckStatus) => ['checks', status ?? 'all'] as const,
  detail: (id: string) => ['checks', id] as const,
  images: (checkId: string) => ['checks', checkId, 'images'] as const,
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

export function useCheckImages(checkId: string) {
  return useQuery({
    queryKey: checksKeys.images(checkId),
    queryFn: () => listCheckImages(checkId),
    enabled: !!checkId,
  })
}

export function useUploadCheckImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      checkId,
      file,
      actorId,
    }: {
      checkId: string
      file: File | Blob
      actorId: string
    }) => uploadCheckImage(checkId, file, actorId),
    onSuccess: (image) => {
      queryClient.invalidateQueries({ queryKey: checksKeys.images(image.check_id) })
    },
  })
}

export function useDeleteCheckImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, checkId, path }: { id: string; checkId: string; path: string }) =>
      deleteCheckImage(id, path).then(() => checkId),
    onSuccess: (checkId) => {
      queryClient.invalidateQueries({ queryKey: checksKeys.images(checkId) })
    },
  })
}
