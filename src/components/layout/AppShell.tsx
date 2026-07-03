import { NavLink, Outlet } from 'react-router-dom'
import clsx from 'clsx'
import { useAuth } from '../../features/auth/useAuth'
import { PlanetBadges } from '../../features/gamification/PlanetBadges'
import { useSupernovaListener } from '../../features/supernova/hooks'
import { useOutboxSync } from '../../features/capture/hooks'
import { OutboxIndicator } from '../../features/capture/OutboxIndicator'
import { ChecksDueIndicator } from '../../features/checks/ChecksDueIndicator'
import { RadialFab } from '../../features/fab/RadialFab'
import { CometsBackground } from '../CometsBackground'
import { Button } from '../ui/Button'
import type { UserRole } from '../../types/domain'

const navItems: { to: string; label: string; end?: boolean; allow?: UserRole[] }[] = [
  { to: '/', label: 'لوحة التحكم', end: true },
  { to: '/suppliers', label: 'الموردون' },
  { to: '/checks', label: 'الشيكات' },
  { to: '/sales-report', label: 'تقرير المبيعات' },
  { to: '/ledger', label: 'دفتر القيد' },
  { to: '/skim', label: 'إفراغ الدرج' },
  { to: '/expenses', label: 'المصروفات' },
  { to: '/close', label: 'إغلاق اليوم' },
  { to: '/nebula', label: 'سديم التدفق 🌫️' },
  { to: '/obligations', label: 'الالتزامات', allow: ['admin', 'super_admin'] },
  { to: '/back-office', label: 'الباك أوفيس', allow: ['admin', 'super_admin'] },
]

const roleLabels: Record<string, string> = {
  super_admin: 'مدير عام',
  admin: 'إدارة',
  monitor: 'مراقب',
  cashier: 'كاشير',
}

export function AppShell() {
  const { profile, signOut } = useAuth()
  useSupernovaListener()
  useOutboxSync()

  return (
    <div className="min-h-svh">
      <CometsBackground />
      <header className="border-b border-glass-border bg-glass-bg backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <nav className="flex flex-wrap items-center gap-1">
            {navItems
              .filter((item) => !item.allow || (profile && item.allow.includes(profile.role)))
              .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'text-gray-300 hover:bg-white/5',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <ChecksDueIndicator />
            <OutboxIndicator />
            <PlanetBadges />
            <span className="text-sm text-gray-400">
              {profile?.full_name}
              {profile && (
                <span className="ms-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">
                  {roleLabels[profile.role] ?? profile.role}
                </span>
              )}
            </span>
            <Button variant="secondary" onClick={() => signOut()}>
              خروج
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
      <RadialFab />
    </div>
  )
}
