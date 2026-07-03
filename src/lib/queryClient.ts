import { QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

// gcTime طويل (أسبوع) شرط لأن persist-client يتطلب أن يبقى الاستعلام في الذاكرة
// مدةً لا تقل عن عمر النسخة المحفوظة، لتعمل القراءة دون اتصال بعد إعادة التحميل.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      retry: 1,
    },
  },
})

export const queryPersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'fadi-logic-query-cache',
})

