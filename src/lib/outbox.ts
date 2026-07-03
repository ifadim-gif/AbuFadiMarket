import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export type OutboxStatus = 'pending' | 'synced' | 'conflict' | 'error'

export interface OutboxInvoice {
  id: string // معرّف من توليد العميل = invoices.id (يجعل التصريف idempotent)
  supplier_id: string
  paper_no: string
  amount: number
  due_date: string | null
  created_by: string
  status: OutboxStatus
  error?: string
  createdAt: number
}

interface FadiDB extends DBSchema {
  outbox: {
    key: string
    value: OutboxInvoice
    indexes: { 'by-status': OutboxStatus }
  }
}

let dbPromise: Promise<IDBPDatabase<FadiDB>> | null = null

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<FadiDB>('fadi-logic-outbox', 1, {
      upgrade(db) {
        const store = db.createObjectStore('outbox', { keyPath: 'id' })
        store.createIndex('by-status', 'status')
      },
    })
  }
  return dbPromise
}

export async function addToOutbox(item: OutboxInvoice): Promise<void> {
  const db = await getDb()
  await db.put('outbox', item)
}

export async function getOutbox(): Promise<OutboxInvoice[]> {
  const db = await getDb()
  const all = await db.getAll('outbox')
  return all.sort((a, b) => a.createdAt - b.createdAt)
}

export async function updateOutboxItem(id: string, patch: Partial<OutboxInvoice>): Promise<void> {
  const db = await getDb()
  const existing = await db.get('outbox', id)
  if (!existing) return
  await db.put('outbox', { ...existing, ...patch })
}

export async function deleteOutboxItem(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('outbox', id)
}
