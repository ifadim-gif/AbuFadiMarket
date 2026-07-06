import { supabase } from '../../lib/supabaseClient'

export type CategoryKind = 'supplier' | 'expense'

export interface CategoryRow {
  id: string
  name: string
  kind: CategoryKind
}

export async function listCategories(kind: CategoryKind): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, kind')
    .eq('kind', kind)
    .order('name', { ascending: true })
  if (error) throw error
  return data as CategoryRow[]
}

export async function createCategory(name: string, kind: CategoryKind): Promise<CategoryRow> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name, kind })
    .select('id, name, kind')
    .single()
  if (error) throw error
  return data as CategoryRow
}
