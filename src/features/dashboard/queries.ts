import { supabase } from '../../lib/supabaseClient'
import type { Account } from '../../types/domain'

export async function listAccounts(): Promise<Account[]> {
  const { data, error } = await supabase.from('accounts').select('*').order('code')
  if (error) throw error
  return data
}

export interface DashboardStats {
  supplierCount: number
  totalSupplierDebt: number
  checksDueSoon: number
  redFlaggedSuppliers: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [{ data: suppliers, error: suppliersError }, { count: checksDueSoon, error: checksError }] =
    await Promise.all([
      supabase.from('suppliers').select('balance, red_flag'),
      supabase
        .from('checks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'available')
        .lte('due_date', new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)),
    ])
  if (suppliersError) throw suppliersError
  if (checksError) throw checksError

  return {
    supplierCount: suppliers?.length ?? 0,
    totalSupplierDebt: (suppliers ?? []).reduce((sum, s) => sum + s.balance, 0),
    checksDueSoon: checksDueSoon ?? 0,
    redFlaggedSuppliers: (suppliers ?? []).filter((s) => s.red_flag).length,
  }
}

export interface ChecksDuePoint {
  due_date: string
  amount: number
}

export async function getChecksDueTimeline(): Promise<ChecksDuePoint[]> {
  const { data, error } = await supabase
    .from('checks')
    .select('due_date, amount')
    .not('due_date', 'is', null)
    .in('status', ['available', 'endorsed'])
    .order('due_date', { ascending: true })
  if (error) throw error

  const grouped = new Map<string, number>()
  for (const c of data ?? []) {
    const key = c.due_date!
    grouped.set(key, (grouped.get(key) ?? 0) + c.amount)
  }
  return [...grouped.entries()].map(([due_date, amount]) => ({ due_date, amount }))
}

const ASSET_CODES = new Set(['cash_drawer', 'accumulated_cash', 'bank', 'checks_on_hand'])

export interface LedgerHistoryPoint {
  date: string
  cash_drawer: number
  accumulated_cash: number
  bank: number
  checks_on_hand: number
  suppliers_payable: number
}

/**
 * حركة تراكمية نسبية لكل حاوية اعتمادًا على ledger_entries فقط (تبدأ من صفر،
 * ولا تُعيد بناء الرصيد الابتدائي المزروع مباشرة قبل وجود أي حركة) — اتجاه
 * صادق بدل بيانات تاريخية مُصطنَعة.
 */
export async function getLedgerBalanceHistory(): Promise<LedgerHistoryPoint[]> {
  const { data, error } = await supabase
    .from('ledger_entries')
    .select('debit, credit, accounts(code), transactions(created_at)')
  if (error) throw error

  const rows = (data ?? [])
    .filter((r) => r.accounts && r.transactions?.created_at)
    .map((r) => ({
      code: r.accounts!.code,
      delta: ASSET_CODES.has(r.accounts!.code) ? r.debit - r.credit : r.credit - r.debit,
      createdAt: r.transactions!.created_at as string,
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  const running: Omit<LedgerHistoryPoint, 'date'> = {
    cash_drawer: 0,
    accumulated_cash: 0,
    bank: 0,
    checks_on_hand: 0,
    suppliers_payable: 0,
  }
  const points: LedgerHistoryPoint[] = []
  for (const row of rows) {
    running[row.code as keyof typeof running] += row.delta
    points.push({ date: row.createdAt.slice(0, 16).replace('T', ' '), ...running })
  }
  return points
}
