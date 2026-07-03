import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { haptic } from '../../lib/haptics'
import type { UserRole } from '../../types/domain'

interface FabAction {
  label: string
  emoji: string
  to: string
  allow: UserRole[]
}

const actions: FabAction[] = [
  { label: 'فاتورة', emoji: '🧾', to: '/invoices/new', allow: ['admin', 'super_admin', 'cashier'] },
  { label: 'إفراغ الدرج', emoji: '💵', to: '/skim', allow: ['admin', 'super_admin', 'cashier'] },
  { label: 'إغلاق اليوم', emoji: '🪐', to: '/close', allow: ['admin', 'super_admin', 'cashier'] },
  { label: 'الموردون', emoji: '🌠', to: '/suppliers', allow: ['admin', 'super_admin', 'monitor', 'cashier'] },
]

export function RadialFab() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { profile } = useAuth()

  if (!profile) return null
  const role = profile.role
  const visible = actions.filter((a) => a.allow.includes(role))
  if (visible.length === 0) return null

  function toggle() {
    haptic('tap')
    setOpen((v) => !v)
  }

  function go(to: string) {
    haptic('tap')
    setOpen(false)
    navigate(to)
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col-reverse items-center gap-3">
      <AnimatePresence>
        {open &&
          visible.map((action, i) => (
            <motion.button
              key={action.to}
              initial={{ opacity: 0, y: 20, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.6 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => go(action.to)}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-glass-border bg-glass-bg text-xl shadow-lg backdrop-blur-xl"
              title={action.label}
            >
              {action.emoji}
            </motion.button>
          ))}
      </AnimatePresence>
      <motion.button
        onClick={toggle}
        animate={{ rotate: open ? 45 : 0 }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500 text-3xl text-white shadow-xl"
        aria-label="عصا القيادة المدارية"
      >
        +
      </motion.button>
    </div>
  )
}
