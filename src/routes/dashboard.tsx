import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { listCasesFn } from '../server/caseFunctions'
import type { Case, CaseForStudent } from '../server/caseFunctions'
import { listCaseSetsFn, getCaseSetWithCasesFn } from '../server/caseSetFunctions'
import type { CaseSet, CaseSetWithCases } from '../server/caseSetFunctions'
import { getMyProgressFn } from '../server/progressFunctions'
import type { StudentProgress, ProgressStatus } from '../server/progressFunctions'
import { useAuthStore, clearAuthUser } from '../store/authStore'
import { clearStoredToken, getStoredToken } from '../lib/authClient'
import { logoutFn } from '../server/authFunctions'
import ProgressRing from '../components/ProgressRing'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

// ─── Config ───────────────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG = {
  beginner:     { label: 'Beginner',     color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
  intermediate: { label: 'Intermediate', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  advanced:     { label: 'Advanced',     color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
} as const

const STATUS_CONFIG: Record<ProgressStatus, { label: string; color: string; bg: string; border: string }> = {
  not_started: { label: 'Not started', color: '#475569', bg: 'rgba(71,85,105,0.15)',   border: 'rgba(71,85,105,0.3)' },
  in_progress: { label: 'In progress', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  submitted:   { label: 'Submitted',   color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function StatusBadge({ status }: { status: ProgressStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium font-mono"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  )
}

function CaseCard({
  c,
  status,
  caseSetId,
}: {
  c: Case | CaseForStudent
  status: ProgressStatus
  caseSetId?: string
}) {
  const actionLabel = status === 'submitted' ? 'Review' : status === 'in_progress' ? 'Continue' : 'Open case'

  return (
    <Link
      to="/viewer"
      search={{ slide: c.slide_id, case: c.id, ...(caseSetId ? { caseSet: caseSetId } : {}) }}
      className="group flex items-start gap-3 rounded-lg p-4 transition-all hover:border-cyan-500/30"
      style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(148,163,184,0.08)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <h3 className="text-xs font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
            {c.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <DifficultyBadge difficulty={c.difficulty} />
          <StatusBadge status={status} />
        </div>
        {c.clinical_description ? (
          <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">{c.clinical_description}</p>
        ) : null}
      </div>
      <span className="shrink-0 mt-0.5 text-[11px] font-medium text-cyan-500 group-hover:text-cyan-300 transition-colors whitespace-nowrap">
        {actionLabel} →
      </span>
    </Link>
  )
}

function CaseSetSection({
  caseSet,
  cases,
  progressMap,
}: {
  caseSet: CaseSet
  cases: (Case | CaseForStudent)[]
  progressMap: Record<string, ProgressStatus>
}) {
  const total = cases.length
  const submitted = cases.filter((c) => progressMap[c.id] === 'submitted').length
  const inProgress = cases.filter((c) => progressMap[c.id] === 'in_progress').length
  const ringValue = total > 0 ? submitted / total : 0
  const ringColor = submitted === total && total > 0 ? '#34d399' : '#22d3ee'

  // Find a "Continue" shortcut — first in_progress case, then first not_started
  const nextCase =
    cases.find((c) => progressMap[c.id] === 'in_progress') ??
    cases.find((c) => !progressMap[c.id] || progressMap[c.id] === 'not_started')

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(148,163,184,0.1)' }}
    >
      {/* Set header */}
      <div
        className="flex items-center gap-4 px-5 py-4"
        style={{ background: 'rgba(15,23,42,0.95)' }}
      >
        <ProgressRing
          value={ringValue}
          size={44}
          stroke={3.5}
          color={ringColor}
          label={`${submitted}/${total}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-slate-100">{caseSet.title}</h2>
            <span className="font-mono text-[10px] text-slate-600 bg-slate-800/60 rounded px-1.5 py-px border border-slate-700/40">
              {caseSet.class_code}
            </span>
          </div>
          {caseSet.description && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{caseSet.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-slate-600">
            <span>{total} cases</span>
            {inProgress > 0 && <span className="text-amber-500/70">{inProgress} in progress</span>}
            {submitted > 0 && <span className="text-emerald-500/70">{submitted} submitted</span>}
          </div>
        </div>

        {nextCase && submitted < total && (
          <Link
            to="/viewer"
            search={{ slide: nextCase.slide_id, case: nextCase.id, caseSet: caseSet.id }}
            className="shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-[#020617] transition-all hover:brightness-110"
            style={{ background: '#22d3ee' }}
          >
            {inProgress > 0 ? 'Continue' : 'Start'}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}
        {submitted === total && total > 0 && (
          <span className="shrink-0 text-[11px] font-mono text-emerald-400">Complete</span>
        )}
      </div>

      {/* Cases list */}
      <div className="divide-y divide-slate-800/50" style={{ background: 'rgba(10,16,38,0.6)' }}>
        {cases.map((c) => (
          <div key={c.id} className="px-3 py-2">
            <CaseCard
              c={c}
              status={progressMap[c.id] ?? 'not_started'}
              caseSetId={caseSet.id}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const status = useAuthStore((s) => s.status)

  const [caseSets, setCaseSets] = useState<CaseSetWithCases[]>([])
  const [standaloneCases, setStandaloneCases] = useState<(Case | CaseForStudent)[]>([])
  const [progressMap, setProgressMap] = useState<Record<string, ProgressStatus>>({})
  const [loading, setLoading] = useState(true)

  // Redirect unauthenticated
  useEffect(() => {
    if (status === 'unauthenticated') navigate({ to: '/join' })
  }, [status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status !== 'authenticated') return

    const loadAll = async () => {
      try {
        // Load case sets with their cases
        const sets = await listCaseSetsFn()
        const setsWithCases = await Promise.all(
          sets.map((s) => getCaseSetWithCasesFn({ data: s.id }))
        )
        const validSets = setsWithCases.filter((s): s is CaseSetWithCases => s !== null)
        setCaseSets(validSets)

        // IDs of cases already in a set
        const caseIdsInSets = new Set(validSets.flatMap((s) => s.cases.map((c) => c.id)))

        // Load all published cases; filter to those not in any set
        const allCases = await listCasesFn()
        setStandaloneCases(allCases.filter((c) => !caseIdsInSets.has(c.id)))

        // Load student progress
        if (user?.role === 'student') {
          const progress = await getMyProgressFn()
          const map: Record<string, ProgressStatus> = {}
          for (const p of progress) map[p.case_id] = p.status
          setProgressMap(map)
        }
      } catch {
        // silent — empty state shown
      } finally {
        setLoading(false)
      }
    }

    loadAll()
  }, [status, user?.role]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const isEmpty = !loading && caseSets.length === 0 && standaloneCases.length === 0

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
            <Link to="/instructor" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
              Instructor Panel
            </Link>
          )}
          <span className="text-xs text-slate-500 font-mono">{user?.display_name}</span>
          <button onClick={handleLogout} className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
            Sign out
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-100 mb-1">
            {user?.role === 'instructor' ? 'Course Overview' : 'My Cases'}
          </h1>
          <p className="text-sm text-slate-500">
            {user?.role === 'instructor'
              ? 'Case sets assigned to your classes.'
              : `Welcome back, ${user?.display_name}.`}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="text-xs text-slate-600 font-mono animate-pulse">Loading…</span>
          </div>
        ) : isEmpty ? (
          <div
            className="flex flex-col items-center justify-center rounded-xl py-20 text-center"
            style={{ border: '1px dashed rgba(148,163,184,0.12)' }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mb-4 opacity-30">
              <rect x="4" y="4" width="24" height="24" rx="3" stroke="#94a3b8" strokeWidth="1.5" />
              <circle cx="16" cy="16" r="6" stroke="#94a3b8" strokeWidth="1.5" />
              <circle cx="16" cy="16" r="2" fill="#94a3b8" />
            </svg>
            <p className="text-sm text-slate-500 mb-1">No cases available yet</p>
            <p className="text-xs text-slate-700">
              {user?.role === 'instructor'
                ? 'Create case sets from the Instructor Panel.'
                : 'Check back once your instructor assigns a case set.'}
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
          <>
            {/* Case sets */}
            {caseSets.length > 0 && (
              <div className="space-y-5">
                {caseSets.map((cs) => (
                  <CaseSetSection
                    key={cs.id}
                    caseSet={cs}
                    cases={cs.cases}
                    progressMap={progressMap}
                  />
                ))}
              </div>
            )}

            {/* Standalone cases (not in any set) */}
            {standaloneCases.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
                  {caseSets.length > 0 ? 'Other Cases' : 'Cases'}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {standaloneCases.map((c) => (
                    <CaseCard
                      key={c.id}
                      c={c}
                      status={progressMap[c.id] ?? 'not_started'}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
