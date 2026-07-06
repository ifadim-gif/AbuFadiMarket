import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  assignUserRole,
  deleteRole,
  listRolesWithCapabilities,
  listUsers,
  saveRole,
} from './queries'
import type { Capability } from '../auth/capabilities'

export const rolesKeys = {
  roles: ['roles', 'with-capabilities'] as const,
  users: ['roles', 'users'] as const,
}

export function useRolesWithCapabilities() {
  return useQuery({ queryKey: rolesKeys.roles, queryFn: listRolesWithCapabilities })
}

export function useUsers() {
  return useQuery({ queryKey: rolesKeys.users, queryFn: listUsers })
}

export function useSaveRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      roleId,
      name,
      capabilities,
    }: {
      roleId: string | null
      name: string
      capabilities: Capability[]
    }) => saveRole(roleId, name, capabilities),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.roles })
      queryClient.invalidateQueries({ queryKey: rolesKeys.users })
    },
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (roleId: string) => deleteRole(roleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rolesKeys.roles }),
  })
}

export function useAssignUserRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      assignUserRole(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKeys.users })
      queryClient.invalidateQueries({ queryKey: rolesKeys.roles })
    },
  })
}
