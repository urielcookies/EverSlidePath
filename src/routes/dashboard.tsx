import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { listCasesFn } from '../server/caseFunctions'
import type { Case, CaseForStudent } from '../server/caseFunctions'
import { useAuthStore } from '../store/authStore'
import { clearStoredToken } from '../lib/authClient'
import { clearAuthUser } from '../store/authStore'
import { logoutFn } from '../server/authFunctions'
import { getStoredToken } from '../lib/authClient'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

const DIFFICULTY_CONFIG = {
  beginner:     { label: 'Beginner',     color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
  intermediate: { label: 'Intermediate', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  advanced:     { label: 'Advanced',     color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
} as const

function DifficultyBadge({ difficulty }: { difficulty: 'beginner' | 'intermediate' | 'advanced' }) {
  const cfg = DIFFICULTY_CONFIG[difficulty]
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium font-mono"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  )
}

function CaseCard({ c, userId }: { c: Case | CaseForStudent; userId: string }) {
  return (
    <Link
      to="/viewer"
      search={{ slide: c.slide_id, case: c.id }}
      className="group block rounded-xl p-5 transition-all hover:border-cyan-500/30"
      style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(148,163,184,0.1)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors leading-snug">
          {c.title}
        </h3>
        <DifficultyBadge difficulty={c.difficulty} />
      </div>

      {c.clinical_description ? (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-4">
          {c.clinical_description}
        </p>
      ) : (
        <p className="text-xs text-slate-700 italic mb-4">No clinical description provided.</p>
      )}

      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-slate-600">
          {new Date(c.created_at * 1000).toLocaleDateString()}
        </span>
        <span
          className="flex items-center gap-1 text-[11px] font-medium text-cyan-500 group-hover:text-cyan-300 transition-colors"
        >
          Open case
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </Link>
  )
}

function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const status = useAuthStore((s) => s.status)

  const [cases, setCases] = useState<(Case | CaseForStudent)[]>([])
  const [loading, setLoading] = useState(true)

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') navigate({ to: '/join' })
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status !== 'authenticated') return
    listCasesFn()
      .then(setCases)
      .catch(() => setCases([]))
      .finally(() => setLoading(false))
  }, [status])

  const handleLogout = async () => {
    const token = getStoredToken()
    if (token) await logoutFn({ data: { token } }).catch(() => {})
    clearStoredToken()
    clearAuthUser()
    navigate({ to: '/' })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <span className="text-xs text-slate-500 font-mono animate-pulse">Loading…</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Nav */}
      <nav
        className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-slate-800/60 px-6"
        style={{ background: 'rgba(2,6,23,0.95)', backdropFilter: 'blur(12px)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-cyan-500/20 border border-cyan-500/40">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="3.5" stroke="#22d3ee" strokeWidth="1.2" />
              <circle cx="6" cy="6" r="1.2" fill="#22d3ee" />
            </svg>
          </div>
          <span className="text-xs font-semibold tracking-wide text-slate-200">EverSlidePath</span>
        </div>

        <div className="flex items-center gap-4">
          {user?.role === 'instructor' && (
            <Link
              to="/instructor"
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Instructor Panel
            </Link>
          )}
          <span className="text-xs text-slate-500 font-mono">{user?.display_name}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-slate-100 mb-1">
            {user?.role === 'instructor' ? 'Case Library' : 'Study Cases'}
          </h1>
          <p className="text-sm text-slate-500">
            {user?.role === 'instructor'
              ? 'Published cases visible to all students.'
              : `Welcome back, ${user?.display_name}. Select a case to begin.`}
          </p>
        </div>

        {/* Cases grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-xs text-slate-600 font-mono animate-pulse">Loading cases…</span>
          </div>
        ) : cases.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-xl py-20 text-center"
            style={{ border: '1px dashed rgba(148,163,184,0.15)' }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mb-4 opacity-30">
              <rect x="4" y="4" width="24" height="24" rx="3" stroke="#94a3b8" strokeWidth="1.5" />
              <circle cx="16" cy="16" r="6" stroke="#94a3b8" strokeWidth="1.5" />
              <circle cx="16" cy="16" r="2" fill="#94a3b8" />
            </svg>
            <p className="text-sm text-slate-500 mb-1">No cases available yet</p>
            <p className="text-xs text-slate-700">
              {user?.role === 'instructor'
                ? 'Publish cases from the Instructor Panel.'
                : 'Check back once your instructor publishes cases.'}
            </p>
            {user?.role === 'instructor' && (
              <Link
                to="/instructor"
                className="mt-5 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold text-[#020617] transition-all hover:brightness-110"
                style={{ background: '#22d3ee' }}
              >
                Go to Instructor Panel
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => (
              <CaseCard key={c.id} c={c} userId={user?.id ?? ''} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
