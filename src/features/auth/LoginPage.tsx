import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { GlassCard } from '../../components/ui/GlassCard'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import logoFull from '../../assets/logo-full.png'

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
        <div className="mb-6 flex justify-center">
          <img src={logoFull} alt="أبو فادي سوبر ماركت" className="h-16 w-auto rounded-lg bg-white/95 px-3 py-2" />
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-gray-300">
            البريد الإلكتروني
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-gray-300">
            كلمة المرور
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
