import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'

export const fieldClasses =
  'rounded-lg border border-field-border bg-field-bg px-3 py-2 text-white placeholder:text-gray-500 outline-none transition-colors focus:border-brand-red-light focus:ring-2 focus:ring-brand-red-light/30 disabled:cursor-not-allowed disabled:opacity-50'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(fieldClasses, className)} {...props} />
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(fieldClasses, className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(fieldClasses, className)} {...props} />
}
