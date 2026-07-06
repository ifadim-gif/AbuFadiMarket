import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createCategory, listCategories, type CategoryKind } from './queries'

export const categoriesKeys = {
  byKind: (kind: CategoryKind) => ['categories', kind] as const,
}

export function useCategories(kind: CategoryKind) {
  return useQuery({ queryKey: categoriesKeys.byKind(kind), queryFn: () => listCategories(kind) })
}

export function useCreateCategory(kind: CategoryKind) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createCategory(name, kind),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoriesKeys.byKind(kind) })
    },
  })
}
