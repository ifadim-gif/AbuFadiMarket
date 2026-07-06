import { supabase } from '../../lib/supabaseClient'
import type { Capability } from '../auth/capabilities'

export interface RoleRow {
  id: string
  code: string | null
  name_ar: string
  is_system: boolean
  capabilities: Capability[]
}

export interface UserRow {
  id: string
  full_name: string
  role_id: string
  role: string
}

export async function listRolesWithCapabilities(): Promise<RoleRow[]> {
  const { data: roles, error } = await supabase
    .from('roles')
    .select('id, code, name_ar, is_system')
    .order('created_at', { ascending: true })
  if (error) throw error

  const { data: caps, error: capsErr } = await supabase
    .from('role_capabilities')
    .select('role_id, capability_code')
  if (capsErr) throw capsErr

  return roles.map((r) => ({
    ...r,
    capabilities: caps
      .filter((c) => c.role_id === r.id)
      .map((c) => c.capability_code as Capability),
  }))
}

export async function listUsers(): Promise<UserRow[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role_id, role')
    .order('full_name', { ascending: true })
  if (error) throw error
  return data as UserRow[]
}

export async function saveRole(
  roleId: string | null,
  name: string,
  capabilities: Capability[],
): Promise<string> {
  const { data, error } = await supabase.rpc('save_role', {
    p_name: name,
    p_capabilities: capabilities,
    p_role_id: roleId ?? undefined,
  })
  if (error) throw error
  return data as string
}

export async function deleteRole(roleId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_role', { p_role_id: roleId })
  if (error) throw error
}

export async function assignUserRole(userId: string, roleId: string): Promise<void> {
  const { error } = await supabase.rpc('assign_user_role', { p_user: userId, p_role_id: roleId })
  if (error) throw error
}
