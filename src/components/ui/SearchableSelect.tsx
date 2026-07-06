import { useState } from 'react'
import { fieldClasses } from './Input'
import { arabicIncludes } from '../../lib/arabicSearch'
import clsx from 'clsx'

export interface SearchableOption {
  value: string
  label: string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: SearchableOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  const displayValue = open ? query : (selected?.label ?? '')
  const filtered = query.trim() ? options.filter((o) => arabicIncludes(o.label, query)) : options

  return (
    <div className="relative">
      <input
        className={clsx(fieldClasses, 'w-full')}
        value={displayValue}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true)
          setQuery('')
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-field-border bg-space-900 shadow-xl">
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(o.value)
                setQuery('')
                setOpen(false)
              }}
              className={clsx(
                'block w-full px-3 py-2 text-start text-sm hover:bg-white/10',
                o.value === value ? 'bg-brand-red/10 text-white' : 'text-gray-200',
              )}
            >
              {o.label}
            </button>
          ))}
          {filtered.length === 0 && <p className="px-3 py-2 text-sm text-gray-500">لا نتائج</p>}
        </div>
      )}
    </div>
  )
}
