import { useState } from 'react'
import Swal from 'sweetalert2'
import { GlassCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/Button'
import { Input, Select } from '../../components/ui/Input'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { useAuth } from '../auth/useAuth'
import { capabilityLabels, orderedCapabilities, type Capability } from '../auth/capabilities'
import {
  useAssignUserRole,
  useDeleteRole,
  useRolesWithCapabilities,
  useSaveRole,
  useUsers,
} from './hooks'
import type { RoleRow } from './queries'

export function RolesAdminPage() {
  const { data: roles, isLoading, error } = useRolesWithCapabilities()

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-white">الأدوار والصلاحيات</h1>
        <p className="text-sm text-gray-400">
          الصلاحيات هرمية: كل صلاحية تتضمّن ما دونها. الأدوار الأربعة الأساسية مرجعية غير قابلة
          للتعديل أو الحذف.
        </p>
      </div>

      {isLoading && <LoadingSpinner label="جارٍ التحميل..." />}
      {error && <ErrorBanner message="تعذّر تحميل الأدوار" />}

      {roles && (
        <>
          <RolesSection roles={roles} />
          <UsersSection roles={roles} />
        </>
      )}
    </div>
  )
}

function CapabilityChecklist({
  value,
  onChange,
  disabled,
}: {
  value: Capability[]
  onChange: (next: Capability[]) => void
  disabled?: boolean
}) {
  // إغلاق هرمي: تحديد صلاحية يضمّ ما دونها؛ إلغاؤها يلغي ما فوقها.
  function toggle(cap: Capability, checked: boolean) {
    const idx = orderedCapabilities.indexOf(cap)
    const next = checked
      ? orderedCapabilities.slice(0, idx + 1)
      : orderedCapabilities.slice(0, idx)
    onChange(next)
  }
  return (
    <div className="flex flex-wrap gap-3">
      {orderedCapabilities.map((cap) => (
        <label key={cap} className="flex items-center gap-1.5 text-sm text-gray-300">
          <input
            type="checkbox"
            className="h-4 w-4 accent-brand-red"
            checked={value.includes(cap)}
            disabled={disabled}
            onChange={(e) => toggle(cap, e.target.checked)}
          />
          {capabilityLabels[cap]}
        </label>
      ))}
    </div>
  )
}

function RolesSection({ roles }: { roles: RoleRow[] }) {
  const saveRole = useSaveRole()
  const deleteRole = useDeleteRole()
  const [newName, setNewName] = useState('')
  const [newCaps, setNewCaps] = useState<Capability[]>(['capture_documents'])
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    setError(null)
    if (!newName.trim()) {
      setError('اسم الدور مطلوب')
      return
    }
    try {
      await saveRole.mutateAsync({ roleId: null, name: newName.trim(), capabilities: newCaps })
      setNewName('')
      setNewCaps(['capture_documents'])
    } catch {
      setError('تعذّر إنشاء الدور')
    }
  }

  async function handleDelete(role: RoleRow) {
    const confirm = await Swal.fire({
      title: `حذف دور "${role.name_ar}"؟`,
      showCancelButton: true,
      confirmButtonText: 'حذف',
      cancelButtonText: 'إلغاء',
      icon: 'warning',
    })
    if (!confirm.isConfirmed) return
    try {
      await deleteRole.mutateAsync(role.id)
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'تعذّر الحذف',
        text: e instanceof Error ? e.message : 'الدور قد يكون مُسنَدًا لمستخدمين',
        confirmButtonText: 'حسنًا',
      })
    }
  }

  return (
    <GlassCard>
      <h2 className="mb-3 font-semibold text-white">الأدوار</h2>
      <div className="flex flex-col divide-y divide-glass-border">
        {roles.map((role) => (
          <RoleRowEditor key={role.id} role={role} onDelete={() => handleDelete(role)} />
        ))}
      </div>

      <div className="mt-4 border-t border-glass-border pt-4">
        <h3 className="mb-2 text-sm font-semibold text-gray-300">دور جديد</h3>
        <div className="flex flex-col gap-3">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="اسم الدور (مثال: مندوب توصيل)" />
          <CapabilityChecklist value={newCaps} onChange={setNewCaps} />
          {error && <ErrorBanner message={error} />}
          <Button onClick={handleCreate} disabled={saveRole.isPending} className="w-fit">
            {saveRole.isPending ? 'جارٍ الحفظ...' : 'إنشاء الدور'}
          </Button>
        </div>
      </div>
    </GlassCard>
  )
}

function RoleRowEditor({ role, onDelete }: { role: RoleRow; onDelete: () => void }) {
  const saveRole = useSaveRole()
  const [caps, setCaps] = useState<Capability[]>(role.capabilities)
  const [name, setName] = useState(role.name_ar)
  const dirty =
    name !== role.name_ar ||
    caps.length !== role.capabilities.length ||
    caps.some((c) => !role.capabilities.includes(c))

  async function handleSave() {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: `تأكيد تعديل صلاحيات "${role.name_ar}"؟`,
      text: 'سيتأثّر كل مستخدم بهذا الدور فورًا.',
      showCancelButton: true,
      confirmButtonText: 'حفظ',
      cancelButtonText: 'إلغاء',
    })
    if (!confirm.isConfirmed) return
    await saveRole.mutateAsync({ roleId: role.id, name: name.trim(), capabilities: caps })
  }

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center justify-between gap-2">
        {role.is_system ? (
          <span className="font-semibold text-white">{role.name_ar}</span>
        ) : (
          <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-[14rem]" />
        )}
        {role.is_system ? (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-400">أساسي</span>
        ) : (
          <button onClick={onDelete} className="text-xs text-status-danger hover:underline">
            حذف
          </button>
        )}
      </div>
      <CapabilityChecklist value={caps} onChange={setCaps} disabled={role.is_system} />
      {!role.is_system && dirty && (
        <Button onClick={handleSave} disabled={saveRole.isPending} className="w-fit">
          {saveRole.isPending ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
        </Button>
      )}
    </div>
  )
}

function UsersSection({ roles }: { roles: RoleRow[] }) {
  const { data: users } = useUsers()
  const assign = useAssignUserRole()
  const { session } = useAuth()
  const [error, setError] = useState<string | null>(null)

  async function handleAssign(userId: string, userName: string, roleId: string, roleName: string) {
    setError(null)
    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'تأكيد تغيير الدور',
      text: `سيصبح دور "${userName}" هو "${roleName}".`,
      showCancelButton: true,
      confirmButtonText: 'تعيين',
      cancelButtonText: 'إلغاء',
    })
    if (!confirm.isConfirmed) return
    try {
      await assign.mutateAsync({ userId, roleId })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذّر تعيين الدور')
    }
  }

  return (
    <GlassCard>
      <h2 className="mb-3 font-semibold text-white">المستخدمون</h2>
      <p className="mb-3 text-xs text-gray-500">
        إنشاء الحسابات يتم من Supabase؛ هنا تُسنَد الأدوار فقط. لا يمكنك تغيير دور نفسك.
      </p>
      {error && <ErrorBanner message={error} />}
      <div className="flex flex-col divide-y divide-glass-border">
        {users?.map((u) => {
          const isSelf = u.id === session?.user.id
          return (
            <div key={u.id} className="flex items-center justify-between gap-3 py-2">
              <span className="text-sm text-gray-200">{u.full_name}</span>
              <Select
                value={u.role_id}
                disabled={isSelf || assign.isPending}
                onChange={(e) => {
                  const role = roles.find((r) => r.id === e.target.value)
                  handleAssign(u.id, u.full_name, e.target.value, role?.name_ar ?? '')
                }}
                className="max-w-[12rem]"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name_ar}
                  </option>
                ))}
              </Select>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
