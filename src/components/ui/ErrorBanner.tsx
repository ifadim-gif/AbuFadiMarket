export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-status-danger/30 bg-status-danger/10 p-3 text-sm text-status-danger">
      {message}
    </div>
  )
}
