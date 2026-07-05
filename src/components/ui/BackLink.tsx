import { Link } from 'react-router-dom'

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-gray-300 transition-colors hover:text-white"
    >
      <span aria-hidden>→</span>
      {label}
    </Link>
  )
}
