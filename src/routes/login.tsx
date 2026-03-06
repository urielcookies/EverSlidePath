import { useState } from 'react'
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import { loginInstructorFn } from '../server/authFunctions'
import { setAuthUser } from '../store/authStore'
import { setStoredToken } from '../lib/authClient'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    try {
      const result = await loginInstructorFn({ data: { username, password } })
      if (!result.ok || !result.token || !result.user) {
        toast.error(result.error ?? 'Login failed')
        return
      }
      setStoredToken(result.token)
      setAuthUser(result.user)
      toast.success(`Welcome back, ${result.user.display_name}`)
      navigate({ to: '/instructor' })
    } catch {
      toast.error('Login failed — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/20 border border-cyan-500/40">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="4.5" stroke="#22d3ee" strokeWidth="1.4" />
              <circle cx="7" cy="7" r="1.5" fill="#22d3ee" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-wide text-slate-200">EverSlidePath</span>
        </div>

        <div
          className="rounded-xl p-6"
          style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(148,163,184,0.1)' }}
        >
          <h1 className="text-base font-semibold text-slate-100 mb-1">Instructor Login</h1>
          <p className="text-xs text-slate-500 mb-6">Sign in to manage cases and track student progress.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5 tracking-wide uppercase">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                className="w-full rounded-md px-3 py-2 text-sm text-slate-200 bg-slate-800/60 border border-slate-700/60 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors placeholder:text-slate-600"
                placeholder="your-username"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5 tracking-wide uppercase">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-md px-3 py-2 text-sm text-slate-200 bg-slate-800/60 border border-slate-700/60 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors placeholder:text-slate-600"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full rounded-md py-2 text-sm font-semibold text-[#020617] transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#22d3ee' }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-5">
          Student?{' '}
          <Link to="/join" className="text-cyan-500 hover:text-cyan-400 transition-colors">
            Join with a class code
          </Link>
        </p>

        <p className="text-center text-xs text-slate-700 mt-2">
          <Link to="/" className="hover:text-slate-500 transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
