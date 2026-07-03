import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

type BadgeVariant = 'ok' | 'warn' | 'danger' | 'neutral'

const variantClasses: Record<BadgeVariant, string> = {
  ok: 'bg-status-ok/15 text-status-ok border-status-ok/30',
  warn: 'bg-status-warn/15 text-status-warn border-status-warn/30',
  danger: 'bg-status-danger/15 text-status-danger border-status-danger/30',
  neutral: 'bg-white/10 text-gray-300 border-white/15',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ variant = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}
