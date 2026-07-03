import { Link } from 'react-router-dom'
import { useChecksDueSoon } from './hooks'

// شارة ترويسة: تنبيه بالشيكات التي اقترب/تجاوز تاريخ صرفها ولم يُتصرَّف بها.
export function ChecksDueIndicator() {
  const dueSoon = useChecksDueSoon(7)
  if (dueSoon.length === 0) return null

  return (
    <Link
      to="/checks"
      className="inline-flex items-center gap-1 rounded-full bg-status-warn/15 px-2 py-0.5 text-xs text-status-warn"
      title="شيكات اقترب أو حان تاريخ صرفها"
    >
      ⏰ شيكات مستحقة {dueSoon.length}
    </Link>
  )
}
