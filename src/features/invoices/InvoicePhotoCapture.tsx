import { useRef, useState, type ChangeEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import Swal from 'sweetalert2'
import { getInvoiceImageSignedUrl } from './queries'
import { useDeleteInvoiceImage, useInvoiceImages, useUploadInvoiceImage } from './hooks'
import { Button } from '../../components/ui/Button'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { ImageLightbox } from '../../components/ui/ImageLightbox'

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
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
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

  async function handleDelete(id: string, path: string) {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'حذف صورة الفاتورة؟',
      showCancelButton: true,
      confirmButtonText: 'حذف',
      cancelButtonText: 'إلغاء',
    })
    if (!confirm.isConfirmed) return
    remove.mutate({ id, invoiceId, path })
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
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => cameraInput.current?.click()}
            disabled={upload.isPending}
          >
            📷 تصوير
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => galleryInput.current?.click()}
            disabled={upload.isPending}
          >
            {upload.isPending ? 'جارٍ الرفع...' : '🖼️ من المعرض'}
          </Button>
        </div>
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
        <input
          ref={galleryInput}
          type="file"
          accept="image/*"
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
              onDelete={canManage ? () => handleDelete(img.id, img.image_url) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function InvoiceImageThumb({ path, onDelete }: { path: string; onDelete?: () => void }) {
  const [zoomed, setZoomed] = useState(false)
  const { data: url } = useQuery({
    queryKey: ['invoice-image-url', path],
    queryFn: () => getInvoiceImageSignedUrl(path),
  })

  return (
    <>
      <div className="relative aspect-square overflow-hidden rounded-lg border border-glass-border bg-space-900">
        {url && (
          <button type="button" onClick={() => setZoomed(true)} className="block h-full w-full">
            <img src={url} alt="صورة الفاتورة" className="h-full w-full object-cover" />
          </button>
        )}
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
      {zoomed && url && (
        <ImageLightbox src={url} alt="صورة الفاتورة" onClose={() => setZoomed(false)} />
      )}
    </>
  )
}
