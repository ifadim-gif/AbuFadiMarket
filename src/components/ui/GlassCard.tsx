import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-glass-border bg-glass-bg p-4 shadow-2xl backdrop-blur-xl sm:p-6',
        className,
      )}
      {...props}
    />
  )
}
