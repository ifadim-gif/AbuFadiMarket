import type { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

type ButtonVariant = 'primary' | 'secondary' | 'danger'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-red text-white hover:bg-brand-red-light disabled:bg-brand-red/40',
  secondary:
    'bg-white/10 text-gray-200 border border-white/15 hover:bg-white/15 disabled:opacity-40',
  danger: 'bg-status-danger/90 text-white hover:bg-status-danger disabled:opacity-40',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}
