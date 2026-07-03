import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { GlassCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/Button'
import { ErrorBanner } from '../../components/ui/ErrorBanner'

export function LoginPage() {
  const { session, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signIn(email, password)
    setSubmitting(false)
    if (error) setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <GlassCard className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-xl font-bold text-white">
          فادي لوجيك برو
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-gray-300">
            البريد الإلكتروني
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-glass-border bg-space-900 px-3 py-2 text-white outline-none focus:border-indigo-400"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-300">
            كلمة المرور
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-glass-border bg-space-900 px-3 py-2 text-white outline-none focus:border-indigo-400"
            />
          </label>
          {error && <ErrorBanner message={error} />}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'جارٍ الدخول...' : 'تسجيل الدخول'}
          </Button>
        </form>
      </GlassCard>
    </div>
  )
}
