import { useState } from 'react'
import { motion } from 'framer-motion'
import { NavLink, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useAuth } from '../../features/auth/useAuth'
import { haptic } from '../../lib/haptics'
import logoMark from '../../assets/logo-mark.png'
import type { UserRole } from '../../types/domain'

interface NavTile {
  to: string
  label: string
  icon: string
  end?: boolean
  allow?: UserRole[]
}

const navItems: NavTile[] = [
  { to: '/suppliers/today', label: 'تجار اليوم', icon: '📅' },
  { to: '/dashboard', label: 'لوحة التحكم', icon: '🛰️' },
  { to: '/suppliers', label: 'الموردون', icon: '🌠' },
  { to: '/checks', label: 'الشيكات', icon: '📑' },
  { to: '/sales-report', label: 'تقرير المبيعات', icon: '📊' },
  { to: '/ledger', label: 'دفتر القيد', icon: '📒' },
  { to: '/skim', label: 'إفراغ الدرج', icon: '💵' },
  { to: '/expenses', label: 'المصروفات', icon: '💸' },
  { to: '/close', label: 'إغلاق اليوم', icon: '🪐' },
  { to: '/nebula', label: 'سديم التدفق', icon: '🌫️' },
  { to: '/obligations', label: 'الالتزامات', icon: '📌', allow: ['admin', 'super_admin'] },
  { to: '/back-office', label: 'الباك أوفيس', icon: '🛠️', allow: ['admin', 'super_admin'] },
  { to: '/opening-balances', label: 'الأرصدة الافتتاحية', icon: '🧮', allow: ['super_admin'] },
]

interface QuickAction {
  to: string
  label: string
  icon: string
  allow: UserRole[]
}

const quickActions: QuickAction[] = [
  { to: '/invoices/new', label: 'فاتورة جديدة', icon: '🧾', allow: ['admin', 'super_admin', 'cashier'] },
  { to: '/skim', label: 'إفراغ الدرج', icon: '💵', allow: ['admin', 'super_admin', 'cashier'] },
  { to: '/close', label: 'إغلاق اليوم', icon: '🪐', allow: ['admin', 'super_admin', 'cashier'] },
]

export function NavLauncher() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const { profile } = useAuth()

  if (!profile) return null
  const role = profile.role
  const visibleNav = navItems.filter((item) => !item.allow || item.allow.includes(role))
  const visibleActions = quickActions.filter((a) => a.allow.includes(role))

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
    <>
      <motion.button
        onClick={toggle}
        className="fixed bottom-6 left-1/2 z-50 flex h-16 w-16 -translate-x-1/2 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-white shadow-[0_0_0_6px_rgba(228,0,36,0.18)] shadow-black/40"
        aria-label="فتح قائمة التنقل"
        aria-expanded={open}
        whileTap={{ scale: 0.9 }}
      >
        <img src={logoMark} alt="أبو فادي" className="h-full w-full scale-110 object-cover" />
      </motion.button>

      <div
        className={clsx(
          'fixed inset-0 z-[60] flex flex-col bg-space-950/90 backdrop-blur-xl transition-opacity duration-200',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      >
        {open && (
          <div
            className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 overflow-y-auto p-5 pb-28"
            onClick={(e) => e.stopPropagation()}
          >
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <img src={logoMark} alt="" className="h-9 w-9 rounded-full object-cover" />
                  <h2 className="text-lg font-bold text-white">أبو فادي</h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-gray-200"
                  aria-label="إغلاق"
                >
                  ✕
                </button>
              </div>

              {visibleActions.length > 0 && (
                <section>
                  <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    إجراءات سريعة
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {visibleActions.map((a) => (
                      <button
                        key={a.to}
                        onClick={() => go(a.to)}
                        className="flex flex-col items-center gap-2 rounded-2xl border border-brand-red/30 bg-brand-red/10 p-4 text-center transition-colors active:bg-brand-red/20"
                      >
                        <span className="text-2xl">{a.icon}</span>
                        <span className="text-xs font-medium text-gray-100">{a.label}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  الأقسام
                </h3>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {visibleNav.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => {
                        haptic('tap')
                        setOpen(false)
                      }}
                      className={({ isActive }) =>
                        clsx(
                          'flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-colors',
                          isActive
                            ? 'border-brand-red-light/50 bg-brand-red/15'
                            : 'border-glass-border bg-glass-bg active:bg-white/10',
                        )
                      }
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <span className="text-xs font-medium text-gray-100">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </section>
            </div>
        )}
      </div>
    </>
  )
}
