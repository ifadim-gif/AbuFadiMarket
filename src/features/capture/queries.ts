import { supabase } from '../../lib/supabaseClient'
import { addToOutbox, getOutbox, updateOutboxItem, type OutboxInvoice } from '../../lib/outbox'
import type { InvoiceInput } from '../invoices/queries'
import { isDuplicatePaperNoError } from '../invoices/queries'

export type CaptureResult = { mode: 'online'; id: string } | { mode: 'queued'; id: string }

/**
 * التقاط هجين: متّصل → إدراج مباشر (تغذية راجعة فورية لتكرار رقم الفاتورة)؛
 * غير متّصل أو فشل شبكة → إدراج في صندوق الصادر. المعرّف من توليد العميل
 * يُستخدم كمفتاح invoices.id فيجعل إعادة التصريف لاحقًا آمنة (idempotent).
 * ملاحظة: تكرار رقم الفاتورة أثناء الاتصال يُرمى للأعلى لعرضه فورًا للمستخدم.
 */
export async function captureInvoice(
  input: InvoiceInput,
  actorId: string,
): Promise<CaptureResult> {
  const id = crypto.randomUUID()
  const row = { id, ...input, created_by: actorId }

  if (navigator.onLine) {
    const { error } = await supabase.from('invoices').insert(row)
    if (!error) return { mode: 'online', id }
    if (isDuplicatePaperNoError(error)) throw error // تكرار حقيقي — تغذية فورية
    // خطأ شبكة/عابر → أودِعه الصندوق ليُزامَن لاحقًا
  }

  const item: OutboxInvoice = { ...row, status: 'pending', createdAt: Date.now() }
  await addToOutbox(item)
  return { mode: 'queued', id }
}

/** يُصرّف العناصر المعلّقة عند توفّر الشبكة. يُعيد true إن تغيّرت أي حالة. */
export async function drainOutbox(): Promise<boolean> {
  if (!navigator.onLine) return false
  const items = await getOutbox()
  const pending = items.filter((i) => i.status === 'pending')
  let changed = false

  for (const item of pending) {
    // upsert بتجاهل تعارض المعرّف الأساسي يجعل التصريف المزدوج بلا أثر (idempotent)؛
    // فيبقى 23505 الوحيد الممكن هو تعارض unique(supplier_id, paper_no) = تعارض حقيقي.
    const { error } = await supabase
      .from('invoices')
      .upsert(
        {
          id: item.id,
          supplier_id: item.supplier_id,
          paper_no: item.paper_no,
          amount: item.amount,
          due_date: item.due_date,
          created_by: item.created_by,
        },
        { onConflict: 'id', ignoreDuplicates: true },
      )

    if (!error) {
      await updateOutboxItem(item.id, { status: 'synced' })
      changed = true
    } else if (error.code === '23505') {
      await updateOutboxItem(item.id, {
        status: 'conflict',
        error: 'رقم فاتورة مكرّر لنفس المورد',
      })
      changed = true
    } else if (error.code === '42501') {
      await updateOutboxItem(item.id, { status: 'error', error: 'لا صلاحية لحفظ الفاتورة' })
      changed = true
    }
    // خطأ شبكة/عابر آخر: يبقى pending لإعادة المحاولة في التصريف التالي
  }

  return changed
}
