import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'
import { PlanetBadges } from '../../features/gamification/PlanetBadges'
import { useSupernovaListener } from '../../features/supernova/hooks'
import { useOutboxSync } from '../../features/capture/hooks'
import { OutboxIndicator } from '../../features/capture/OutboxIndicator'
import { ChecksDueIndicator } from '../../features/checks/ChecksDueIndicator'
import { NavLauncher } from './NavLauncher'
import { CometsBackground } from '../CometsBackground'
import { Button } from '../ui/Button'
import logoMark from '../../assets/logo-mark.png'

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
      <header className="sticky top-0 z-40 border-b border-glass-border bg-glass-bg backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img src={logoMark} alt="أبو فادي" className="h-8 w-8 rounded-full object-cover" />
            <span className="hidden text-sm font-bold text-white sm:inline">أبو فادي سوبر ماركت</span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <ChecksDueIndicator />
            <OutboxIndicator />
            <PlanetBadges />
            <span className="hidden text-sm text-gray-400 sm:inline">
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
      <main className="mx-auto max-w-6xl p-4 pb-28">
        <Outlet />
      </main>
      <NavLauncher />
    </div>
  )
}
