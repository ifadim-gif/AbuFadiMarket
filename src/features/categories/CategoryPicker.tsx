import { useState } from 'react'
import { Select, Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useCategories, useCreateCategory } from './hooks'
import type { CategoryKind } from './queries'

const NEW_VALUE = '__new__'

export function CategoryPicker({
  kind,
  value,
  onChange,
  canCreate,
}: {
  kind: CategoryKind
  value: string | null
  onChange: (categoryId: string | null) => void
  canCreate: boolean
}) {
  const { data: categories } = useCategories(kind)
  const createCategory = useCreateCategory(kind)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    const category = await createCategory.mutateAsync(name)
    onChange(category.id)
    setCreating(false)
    setNewName('')
  }

  if (creating) {
    return (
      <div className="flex gap-2">
        <Input
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="اسم المجموعة الجديدة"
        />
        <Button type="button" onClick={handleCreate} disabled={createCategory.isPending}>
          إضافة
        </Button>
        <Button type="button" variant="secondary" onClick={() => setCreating(false)}>
          إلغاء
        </Button>
      </div>
    )
  }

  return (
    <Select
      value={value ?? ''}
      onChange={(e) => {
        if (e.target.value === NEW_VALUE) setCreating(true)
        else onChange(e.target.value || null)
      }}
    >
      <option value="">بلا مجموعة</option>
      {categories?.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
      {canCreate && <option value={NEW_VALUE}>+ مجموعة جديدة…</option>}
    </Select>
  )
}
