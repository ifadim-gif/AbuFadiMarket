import { supabase } from '../../lib/supabaseClient'
import type { Check, CheckStatus } from '../../types/domain'

export async function listChecks(status?: CheckStatus): Promise<Check[]> {
  let query = supabase.from('checks').select('*').order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getCheck(id: string): Promise<Check> {
  const { data, error } = await supabase.from('checks').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export type CheckPurpose = 'sale' | 'receivable_settlement'

export interface CreateCheckInput {
  amount: number
  due_date: string | null
  drawer_name: string | null
  customer_ref: string | null
  purpose: CheckPurpose
}

// يمرّ عبر RPC create_check لأن تسجيل الشيك أصبح يُرحّل قيدًا (مدين محفظة
// الشيكات، دائن الإيراد أو ذمم العملاء حسب الغرض). يُعيد معرّف الشيك.
export async function createCheck(input: CreateCheckInput, actorId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_check', {
    p_amount: input.amount,
    p_purpose: input.purpose,
    p_actor: actorId,
    p_due_date: input.due_date ?? undefined,
    p_drawer_name: input.drawer_name ?? undefined,
    p_customer_ref: input.customer_ref ?? undefined,
  })
  if (error) throw error
  return data
}

export interface CheckImageRow {
  id: string
  check_id: string
  image_url: string
  created_at: string | null
}

export async function listCheckImages(checkId: string): Promise<CheckImageRow[]> {
  const { data, error } = await supabase
    .from('check_images')
    .select('*')
    .eq('check_id', checkId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function uploadCheckImage(
  checkId: string,
  file: File | Blob,
  actorId: string,
): Promise<CheckImageRow> {
  const ext = file instanceof File ? file.name.split('.').pop() || 'jpg' : 'jpg'
  const path = `${checkId}/${crypto.randomUUID()}.${ext}`
  const { error: uploadError } = await supabase.storage.from('check-photos').upload(path, file)
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('check_images')
    .insert({ check_id: checkId, image_url: path, created_by: actorId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getCheckImageSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('check-photos').createSignedUrl(path, 3600)
  if (error) throw error
  return data.signedUrl
}

export async function deleteCheckImage(id: string, path: string): Promise<void> {
  await supabase.storage.from('check-photos').remove([path])
  const { error } = await supabase.from('check_images').delete().eq('id', id)
  if (error) throw error
}
