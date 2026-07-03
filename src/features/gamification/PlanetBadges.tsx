import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../auth/useAuth'

const planetInfo: Record<string, { label: string; emoji: string }> = {
  mercury: { label: 'عطارد', emoji: '☿️' },
  venus: { label: 'الزهرة', emoji: '🪐' },
  earth: { label: 'الأرض', emoji: '🌍' },
  mars: { label: 'المريخ', emoji: '🔴' },
  jupiter: { label: 'المشتري', emoji: '🟠' },
}

export function PlanetBadges() {
  const { profile } = useAuth()
  if (!profile) return null

  const planets = profile.unlocked_planets ?? []

  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs text-indigo-200">
        ✨ {profile.stardust}
      </span>
      <AnimatePresence>
        {planets.map((planet) => {
          const info = planetInfo[planet]
          if (!info) return null
          return (
            <motion.span
              key={planet}
              title={info.label}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="text-base"
            >
              {info.emoji}
            </motion.span>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
