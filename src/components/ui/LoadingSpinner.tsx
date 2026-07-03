export function LoadingSpinner({ label = 'جارٍ التحميل...' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 p-6 text-gray-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
