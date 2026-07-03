import type { CheckStatus } from '../../types/domain'

export const statusLabels: Record<CheckStatus, string> = {
  available: 'متاح',
  endorsed: 'مُجيَّر',
  cashed: 'مصروف',
  bounced: 'راجع',
  deposited: 'مودَع',
}

export const statusBadgeVariant: Record<CheckStatus, 'ok' | 'warn' | 'danger' | 'neutral'> = {
  available: 'ok',
  endorsed: 'warn',
  cashed: 'neutral',
  bounced: 'danger',
  deposited: 'warn',
}
