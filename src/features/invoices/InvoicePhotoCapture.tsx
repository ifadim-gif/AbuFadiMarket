import { useRef, useState, type ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getInvoiceImageSignedUrl } from './queries'
import { useDeleteInvoiceImage, useInvoiceImages, useUploadInvoiceImage } from './hooks'
import { Button } from '../../components/ui/Button'
import { ErrorBanner } from '../../components/ui/ErrorBanner'

export function InvoicePhotoCapture({
  invoiceId,
  actorId,
  canManage,
}: {
  invoiceId: string
  actorId: string
  canManage: boolean
}) {
  const { data: images } = useInvoiceImages(invoiceId)
  const upload = useUploadInvoiceImage()
  const remove = useDeleteInvoiceImage()
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setError(null)
    const startOrder = images?.length ?? 0
    try {
      for (let i = 0; i < files.length; i++) {
        await upload.mutateAsync({ invoiceId, file: files[i], sortOrder: startOrder + i, actorId })
      }
    } catch {
      setError('تعذّر رفع إحدى الصور')
    }
  }

  if (!navigator.onLine) {
    return (
      <p className="text-xs text-gray-500">
        صور الفاتورة تحتاج اتصالًا بالإنترنت — يمكن إضافتها لاحقًا بعد المزامنة عبر تعديل الفاتورة.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">صور الفاتورة</span>
        <Button
          type="button"
          variant="secondary"
          onClick={() => fileInput.current?.click()}
          disabled={upload.isPending}
        >
          {upload.isPending ? 'جارٍ الرفع...' : 'تصوير / إضافة صفحة'}
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
      </div>
      {error && <ErrorBanner message={error} />}
      {images && images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img) => (
            <InvoiceImageThumb
              key={img.id}
              path={img.image_url}
              onDelete={
                canManage
                  ? () => remove.mutate({ id: img.id, invoiceId, path: img.image_url })
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

function InvoiceImageThumb({ path, onDelete }: { path: string; onDelete?: () => void }) {
  const { data: url } = useQuery({
    queryKey: ['invoice-image-url', path],
    queryFn: () => getInvoiceImageSignedUrl(path),
  })

  return (
    <div className="relative aspect-square overflow-hidden rounded-lg border border-glass-border bg-space-900">
      {url && <img src={url} alt="صورة الفاتورة" className="h-full w-full object-cover" />}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white"
          aria-label="حذف الصورة"
        >
          ✕
        </button>
      )}
    </div>
  )
}
