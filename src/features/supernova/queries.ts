import { supabase } from '../../lib/supabaseClient'

const CHANNEL_NAME = 'supernova'

export async function getPaymentRecord(): Promise<number> {
  const { data, error } = await supabase
    .from('transactions')
    .select('total')
    .eq('type', 'payment')
    .order('total', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.total ?? 0
}

/**
 * بعد نجاح سداد جديد: إن تجاوز مبلغه كل عمليات السداد السابقة، يبثّ العميل
 * حدث احتفال عبر قناة Realtime broadcast لكل الشاشات المفتوحة (السوبرنوفا).
 * أفضل-جهد (best-effort): تعطّل هذا البثّ لا يوقف نجاح عملية السداد نفسها.
 */
export async function checkAndBroadcastRecord(newTxnId: string, total: number): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('total')
      .eq('type', 'payment')
      .neq('id', newTxnId)
      .order('total', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error

    const previousRecord = data?.total ?? 0
    if (total > previousRecord) {
      const channel = supabase.channel(CHANNEL_NAME)
      await new Promise<void>((resolve) => {
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve()
        })
      })
      await channel.send({
        type: 'broadcast',
        event: 'record_payment',
        payload: { total, previousRecord },
      })
      await supabase.removeChannel(channel)
    }
  } catch {
    // احتفال فائت لا يستحق كسر تدفّق السداد الناجح فعليًا
  }
}

export function subscribeToSupernova(onRecord: (payload: { total: number; previousRecord: number }) => void) {
  const channel = supabase
    .channel(CHANNEL_NAME)
    .on('broadcast', { event: 'record_payment' }, ({ payload }) => onRecord(payload))
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
