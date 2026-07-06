import { useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import Swal from 'sweetalert2'
import { getCheckImageSignedUrl } from './queries'
import { useCheckImages, useDeleteCheckImage, useUploadCheckImage } from './hooks'
import { Button } from '../../components/ui/Button'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { ImageLightbox } from '../../components/ui/ImageLightbox'

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export function CheckPhotoCapture({
  checkId,
  actorId,
  canManage,
}: {
  checkId: string
  actorId: string
  canManage: boolean
}) {
  const { data: images } = useCheckImages(checkId)
  const upload = useUploadCheckImage()
  const remove = useDeleteCheckImage()
  const cameraInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)
  const [pendingUrl, setPendingUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const latest = images?.[0]

  function handleSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setPendingUrl(URL.createObjectURL(file))
  }

  async function handleCropped(blob: Blob) {
    try {
      await upload.mutateAsync({ checkId, file: blob, actorId })
      setPendingUrl(null)
    } catch {
      setError('تعذّر رفع صورة الشيك')
    }
  }

  async function handleDelete(id: string, path: string) {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'حذف صورة الشيك؟',
      showCancelButton: true,
      confirmButtonText: 'حذف',
      cancelButtonText: 'إلغاء',
    })
    if (!confirm.isConfirmed) return
    remove.mutate({ id, checkId, path })
  }

  if (!navigator.onLine) {
    return (
      <p className="text-xs text-gray-500">
        تصوير الشيك يحتاج اتصالًا بالإنترنت — أضِفه لاحقًا بعد عودة الشبكة.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">صورة الشيك</span>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => cameraInput.current?.click()}>
            📷 تصوير
          </Button>
          <Button type="button" variant="secondary" onClick={() => galleryInput.current?.click()}>
            🖼️ من المعرض
          </Button>
        </div>
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleSelect}
        />
        <input
          ref={galleryInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleSelect}
        />
      </div>

      {error && <ErrorBanner message={error} />}

      {pendingUrl && (
        <CropDialog
          imageUrl={pendingUrl}
          uploading={upload.isPending}
          onCancel={() => setPendingUrl(null)}
          onConfirm={handleCropped}
        />
      )}

      {latest && (
        <CheckImageThumb
          path={latest.image_url}
          onDelete={canManage ? () => handleDelete(latest.id, latest.image_url) : undefined}
        />
      )}
    </div>
  )
}

function CropDialog({
  imageUrl,
  uploading,
  onCancel,
  onConfirm,
}: {
  imageUrl: string
  uploading: boolean
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}) {
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<Rect | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  function pointFromEvent(e: ReactPointerEvent) {
    const box = containerRef.current!.getBoundingClientRect()
    return {
      x: Math.min(Math.max(e.clientX - box.left, 0), box.width),
      y: Math.min(Math.max(e.clientY - box.top, 0), box.height),
    }
  }

  function handlePointerDown(e: ReactPointerEvent) {
    const p = pointFromEvent(e)
    dragStart.current = p
    setRect({ x: p.x, y: p.y, w: 0, h: 0 })
  }

  function handlePointerMove(e: ReactPointerEvent) {
    if (!dragStart.current) return
    const p = pointFromEvent(e)
    const start = dragStart.current
    setRect({
      x: Math.min(start.x, p.x),
      y: Math.min(start.y, p.y),
      w: Math.abs(p.x - start.x),
      h: Math.abs(p.y - start.y),
    })
  }

  function handlePointerUp() {
    dragStart.current = null
  }

  function confirm() {
    const img = imgRef.current
    if (!img) return
    const scaleX = img.naturalWidth / img.clientWidth
    const scaleY = img.naturalHeight / img.clientHeight

    // بلا تحديد قصّ → رفع الصورة كاملة كما هي (سلوك آمن افتراضي).
    const useFull = !rect || rect.w < 10 || rect.h < 10
    const sx = useFull ? 0 : rect!.x * scaleX
    const sy = useFull ? 0 : rect!.y * scaleY
    const sw = useFull ? img.naturalWidth : rect!.w * scaleX
    const sh = useFull ? img.naturalHeight : rect!.h * scaleY

    const canvas = document.createElement('canvas')
    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
    canvas.toBlob((blob) => blob && onConfirm(blob), 'image/jpeg', 0.9)
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-glass-border p-3">
      <p className="text-xs text-gray-400">اسحب لتحديد الشيك فقط داخل الصورة، ثم اضغط "قصّ ورفع".</p>
      <div
        ref={containerRef}
        className="relative select-none touch-none overflow-hidden rounded-lg"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <img ref={imgRef} src={imageUrl} alt="معاينة الشيك" className="block w-full" draggable={false} />
        {rect && (
          <div
            className="pointer-events-none absolute border-2 border-brand-red-light bg-brand-red/10"
            style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
          />
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" onClick={confirm} disabled={uploading}>
          {uploading ? 'جارٍ الرفع...' : 'قصّ ورفع'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={uploading}>
          إلغاء
        </Button>
      </div>
    </div>
  )
}

function CheckImageThumb({ path, onDelete }: { path: string; onDelete?: () => void }) {
  const [zoomed, setZoomed] = useState(false)
  const { data: url } = useQuery({
    queryKey: ['check-image-url', path],
    queryFn: () => getCheckImageSignedUrl(path),
  })

  return (
    <>
      <div className="relative w-40 overflow-hidden rounded-lg border border-glass-border bg-space-900">
        {url && (
          <button type="button" onClick={() => setZoomed(true)} className="block w-full">
            <img src={url} alt="صورة الشيك" className="w-full object-cover" />
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
      {zoomed && url && <ImageLightbox src={url} alt="صورة الشيك" onClose={() => setZoomed(false)} />}
    </>
  )
}
