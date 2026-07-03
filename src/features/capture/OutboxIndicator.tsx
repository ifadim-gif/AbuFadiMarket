import { Link } from 'react-router-dom'
import { useOnlineStatus, useOutbox } from './hooks'

export function OutboxIndicator() {
  const online = useOnlineStatus()
  const { data: items } = useOutbox()

  const pending = items?.filter((i) => i.status === 'pending').length ?? 0
  const needsAttention = items?.filter((i) => i.status === 'conflict' || i.status === 'error').length ?? 0

  return (
    <Link to="/outbox" className="flex items-center gap-2 text-xs">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
          online ? 'bg-status-ok/15 text-status-ok' : 'bg-status-warn/15 text-status-warn'
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${online ? 'bg-status-ok' : 'bg-status-warn'}`} />
        {online ? 'متّصل' : 'دون اتصال'}
      </span>
      {pending > 0 && (
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-gray-200">
          بالانتظار {pending}
        </span>
      )}
      {needsAttention > 0 && (
        <span className="rounded-full bg-status-danger/15 px-2 py-0.5 text-status-danger">
          يحتاج انتباه {needsAttention}
        </span>
      )}
    </Link>
  )
}
