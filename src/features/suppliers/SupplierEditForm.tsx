import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { Input, Textarea } from '../../components/ui/Input'
import { CategoryPicker } from '../categories/CategoryPicker'
import { useUpdateSupplierDetails } from './hooks'
import type { Supplier } from '../../types/domain'

export function SupplierEditForm({ supplier, onDone }: { supplier: Supplier; onDone: () => void }) {
  const updateDetails = useUpdateSupplierDetails()
  const [name, setName] = useState(supplier.name)
  const [nameHe, setNameHe] = useState(supplier.name_he ?? '')
  const [phone, setPhone] = useState(supplier.phone ?? '')
  const [categoryId, setCategoryId] = useState<string | null>(supplier.category_id)
  const [notes, setNotes] = useState(supplier.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await updateDetails.mutateAsync({
        id: supplier.id,
        input: {
          name,
          name_he: nameHe || null,
          phone: phone || null,
          category_id: categoryId,
          notes: notes || null,
        },
      })
      onDone()
    } catch {
      setError('تعذّر حفظ بيانات المورد')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-gray-300">
        اسم المورد
        <Input required value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-300">
        الاسم بالعبرية
        <Input dir="rtl" value={nameHe} onChange={(e) => setNameHe(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-300">
        الهاتف
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-300">
        المجموعة
        <CategoryPicker kind="supplier" value={categoryId} onChange={setCategoryId} canCreate />
      </label>
      <label className="flex flex-col gap-1 text-sm text-gray-300">
        ملاحظات
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {error && <ErrorBanner message={error} />}

      <div className="flex gap-2">
        <Button type="submit" disabled={updateDetails.isPending}>
          {updateDetails.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          إلغاء
        </Button>
      </div>
    </form>
  )
}
