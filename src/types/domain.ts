import type { Database } from './database.types'

type Tables = Database['public']['Tables']

export type Profile = Tables['profiles']['Row']
export type Supplier = Tables['suppliers']['Row']
export type Category = Tables['categories']['Row']
export type Invoice = Tables['invoices']['Row']
export type Check = Tables['checks']['Row']
export type Account = Tables['accounts']['Row']
export type Transaction = Tables['transactions']['Row']
export type LedgerEntry = Tables['ledger_entries']['Row']
export type AuditLogEntry = Tables['audit_log']['Row']
export type DailyClose = Tables['daily_closes']['Row']
export type ExpectedObligation = Tables['expected_obligations']['Row']
export type CashFlowDay = Database['public']['Functions']['project_cash_flow']['Returns'][number]

export type UserRole = Database['public']['Enums']['user_role']
export type CheckStatus = Database['public']['Enums']['check_status']
export type TxnType = Database['public']['Enums']['txn_type']

export type InvoiceWithSupplier = Invoice & { supplier: Pick<Supplier, 'id' | 'name'> }
