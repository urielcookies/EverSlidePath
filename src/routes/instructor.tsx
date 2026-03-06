import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  listCasesFn,
  createCaseFn,
  updateCaseFn,
  deleteCaseFn,
} from '../server/caseFunctions'
import type { Case } from '../server/caseFunctions'
import { fetchUploadedSlidesFn } from '../server/slideMetadata'
import type { SlideMetadata } from '../server/slideMetadata'
import { LIBRARY_SLIDES } from '../lib/slideLibrary'
import { useAuthStore, clearAuthUser } from '../store/authStore'
import { clearStoredToken, getStoredToken } from '../lib/authClient'
import { logoutFn } from '../server/authFunctions'

export const Route = createFileRoute('/instructor')({
  component: InstructorPage,
})

type Difficulty = 'beginner' | 'intermediate' | 'advanced'

const DIFFICULTY_CONFIG = {
  beginner:     { label: 'Beginner',     color: '#34d399' },
  intermediate: { label: 'Intermediate', color: '#fbbf24' },
  advanced:     { label: 'Advanced',     color: '#f87171' },
} as const

// ─── Slide picker ─────────────────────────────────────────────────────────────

interface SlideOption {
  id: string
  name: string
  source: 'library' | 'uploaded'
}

function SlidePicker({
  value,
  onChange,
  slides,
}: {
  value: string
  onChange: (id: string) => void
  slides: SlideOption[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className="w-full rounded-md px-3 py-2 text-xs text-slate-200 bg-slate-800/60 border border-slate-700/60 outline-none focus:border-cyan-500/50 transition-colors"
    >
      <option value="">— Select a slide —</option>
      {slides.filter((s) => s.source === 'library').length > 0 && (
        <optgroup label="Slide Library">
          {slides.filter((s) => s.source === 'library').map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </optgroup>
      )}
      {slides.filter((s) => s.source === 'uploaded').length > 0 && (
        <optgroup label="Uploaded Slides">
          {slides.filter((s) => s.source === 'uploaded').map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </optgroup>
      )}
    </select>
  )
}

// ─── Create case form ─────────────────────────────────────────────────────────

function CreateCaseForm({
  slides,
  onCreated,
}: {
  slides: SlideOption[]
  onCreated: (c: Case) => void
}) {
  const [slideId, setSlideId] = useState('')
  const [title, setTitle] = useState('')
  const [clinicalDesc, setClinicalDesc] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slideId || !title.trim()) return
    setSaving(true)
    try {
      const result = await createCaseFn({
        data: { slide_id: slideId, title, clinical_description: clinicalDesc, diagnosis, difficulty },
      })
      if (!result.ok || !result.case) {
        toast.error(result.error ?? 'Failed to create case')
        return
      }
      toast.success('Case created')
      onCreated(result.case)
      setSlideId('')
      setTitle('')
      setClinicalDesc('')
      setDiagnosis('')
      setDifficulty('intermediate')
    } catch {
      toast.error('Failed to create case')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Slide</label>
          <SlidePicker value={slideId} onChange={setSlideId} slides={slides} />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Difficulty</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="w-full rounded-md px-3 py-2 text-xs text-slate-200 bg-slate-800/60 border border-slate-700/60 outline-none focus:border-cyan-500/50 transition-colors"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Case Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. Invasive Ductal Carcinoma — H&E"
          className="w-full rounded-md px-3 py-2 text-xs text-slate-200 bg-slate-800/60 border border-slate-700/60 outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-600"
        />
      </div>

      <div>
        <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase tracking-wide">Clinical Description</label>
        <textarea
          value={clinicalDesc}
          onChange={(e) => setClinicalDesc(e.target.value)}
          rows={3}
          placeholder="Patient history, relevant clinical findings…"
          className="w-full rounded-md px-3 py-2 text-xs text-slate-200 bg-slate-800/60 border border-slate-700/60 outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-600 resize-none"
        />
      </div>

      <div>
        <label className="block text-[10px] font-medium text-slate-500 mb-1 uppercase tracking-wide">
          Diagnosis <span className="text-slate-700 normal-case">(hidden from students until submission)</span>
        </label>
        <input
          type="text"
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="e.g. Invasive ductal carcinoma, grade 2"
          className="w-full rounded-md px-3 py-2 text-xs text-slate-200 bg-slate-800/60 border border-slate-700/60 outline-none focus:border-cyan-500/50 transition-colors placeholder:text-slate-600"
        />
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={saving || !slideId || !title.trim()}
          className="flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold text-[#020617] transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: '#22d3ee' }}
        >
          {saving ? 'Creating…' : 'Create Case'}
        </button>
      </div>
    </form>
  )
}

// ─── Case row ─────────────────────────────────────────────────────────────────

function CaseRow({
  c,
  slides,
  onUpdated,
  onDeleted,
}: {
  c: Case
  slides: SlideOption[]
  onUpdated: (updated: Partial<Case> & { id: string }) => void
  onDeleted: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(c.title)
  const [clinicalDesc, setClinicalDesc] = useState(c.clinical_description)
  const [diagnosis, setDiagnosis] = useState(c.diagnosis)
  const [difficulty, setDifficulty] = useState<Difficulty>(c.difficulty)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const cfg = DIFFICULTY_CONFIG[c.difficulty]

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateCaseFn({
        data: { id: c.id, title, clinical_description: clinicalDesc, diagnosis, difficulty },
      })
      if (!result.ok) { toast.error(result.error ?? 'Update failed'); return }
      onUpdated({ id: c.id, title, clinical_description: clinicalDesc, diagnosis, difficulty })
      toast.success('Case updated')
      setEditing(false)
    } catch {
      toast.error('Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePublish = async () => {
    setSaving(true)
    try {
      const result = await updateCaseFn({ data: { id: c.id, is_published: !c.is_published } })
      if (!result.ok) { toast.error(result.error ?? 'Failed'); return }
      onUpdated({ id: c.id, is_published: !c.is_published })
      toast.success(c.is_published ? 'Case unpublished' : 'Case published')
    } catch {
      toast.error('Failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${c.title}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const result = await deleteCaseFn({ data: c.id })
      if (!result.ok) { toast.error(result.error ?? 'Delete failed'); return }
      onDeleted(c.id)
      toast.success('Case deleted')
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="rounded-lg p-4 transition-colors"
      style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(148,163,184,0.08)' }}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 mb-2">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded px-2 py-1 text-sm font-semibold text-slate-100 bg-slate-800/80 border border-slate-700/60 outline-none focus:border-cyan-500/50 transition-colors"
            />
          ) : (
            <h3 className="text-sm font-semibold text-slate-100 truncate">{c.title}</h3>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Difficulty badge */}
          <span
            className="rounded px-1.5 py-px text-[10px] font-mono font-medium"
            style={{ color: cfg.color, background: `${cfg.color}18`, border: `1px solid ${cfg.color}33` }}
          >
            {cfg.label}
          </span>

          {/* Published badge */}
          <span
            className={`rounded px-1.5 py-px text-[10px] font-mono font-medium ${
              c.is_published ? 'text-emerald-400' : 'text-slate-600'
            }`}
            style={{
              background: c.is_published ? 'rgba(52,211,153,0.08)' : 'rgba(71,85,105,0.2)',
              border: `1px solid ${c.is_published ? 'rgba(52,211,153,0.2)' : 'rgba(71,85,105,0.3)'}`,
            }}
          >
            {c.is_published ? 'Published' : 'Draft'}
          </span>
        </div>
      </div>

      {/* Edit fields */}
      {editing && (
        <div className="space-y-2 mb-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] text-slate-600 mb-1 uppercase tracking-wide">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full rounded px-2 py-1 text-xs text-slate-200 bg-slate-800/60 border border-slate-700/60 outline-none focus:border-cyan-500/50"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-slate-600 mb-1 uppercase tracking-wide">Clinical Description</label>
            <textarea
              value={clinicalDesc}
              onChange={(e) => setClinicalDesc(e.target.value)}
              rows={2}
              className="w-full rounded px-2 py-1 text-xs text-slate-300 bg-slate-800/60 border border-slate-700/60 outline-none focus:border-cyan-500/50 resize-none"
            />
          </div>
          <div>
            <label className="block text-[10px] text-slate-600 mb-1 uppercase tracking-wide">Diagnosis</label>
            <input
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full rounded px-2 py-1 text-xs text-slate-300 bg-slate-800/60 border border-slate-700/60 outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        <Link
          to="/viewer"
          search={{ slide: c.slide_id, case: c.id }}
          className="text-[11px] text-cyan-500 hover:text-cyan-300 transition-colors font-medium"
        >
          Open →
        </Link>

        <div className="flex-1" />

        {editing ? (
          <>
            <button
              onClick={() => setEditing(false)}
              className="rounded px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors border border-slate-700/50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded px-2.5 py-1 text-[11px] font-medium text-[#020617] transition-all hover:brightness-110 disabled:opacity-50"
              style={{ background: '#22d3ee' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="rounded px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors border border-slate-700/50"
            >
              Edit
            </button>
            <button
              onClick={handleTogglePublish}
              disabled={saving}
              className="rounded px-2.5 py-1 text-[11px] font-medium transition-all disabled:opacity-50"
              style={
                c.is_published
                  ? { color: '#fbbf24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }
                  : { color: '#34d399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }
              }
            >
              {c.is_published ? 'Unpublish' : 'Publish'}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded px-2.5 py-1 text-[11px] text-red-500/70 hover:text-red-400 transition-colors border border-red-500/20 hover:border-red-500/40 disabled:opacity-50"
            >
              {deleting ? '…' : 'Delete'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── InstructorPage ───────────────────────────────────────────────────────────

function InstructorPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const status = useAuthStore((s) => s.status)

  const [cases, setCases] = useState<Case[]>([])
  const [slides, setSlides] = useState<SlideOption[]>([])
  const [loadingCases, setLoadingCases] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)

  // Redirect non-instructors
  useEffect(() => {
    if (status === 'unauthenticated') { navigate({ to: '/login' }); return }
    if (status === 'authenticated' && user?.role !== 'instructor') navigate({ to: '/dashboard' })
  }, [status, user?.role]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load cases
  useEffect(() => {
    if (status !== 'authenticated') return
    listCasesFn()
      .then((cs) => setCases(cs as Case[]))
      .catch(() => setCases([]))
      .finally(() => setLoadingCases(false))
  }, [status])

  // Load slides (library + uploaded)
  useEffect(() => {
    const libSlides: SlideOption[] = LIBRARY_SLIDES.map((s) => ({
      id: s.id,
      name: s.name,
      source: 'library',
    }))
    setSlides(libSlides)

    fetchUploadedSlidesFn()
      .then((uploaded: SlideMetadata[]) => {
        const uploadedOptions: SlideOption[] = uploaded.map((s) => ({
          id: s.id,
          name: s.name,
          source: 'uploaded',
        }))
        setSlides([...libSlides, ...uploadedOptions])
      })
      .catch(() => {})
  }, [])

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
          <span className="text-[10px] text-slate-600 font-mono ml-1">/ Instructor</span>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-xs text-slate-400 hover:text-slate-200 transition-colors">
            Dashboard
          </Link>
          <span className="text-xs text-slate-500 font-mono">{user?.display_name}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">

        {/* Create case panel */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid rgba(148,163,184,0.1)' }}
        >
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-800/20"
            style={{ background: 'rgba(15,23,42,0.9)' }}
          >
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#22d3ee" strokeWidth="1.5">
                <path d="M7 2v10M2 7h10" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-semibold text-slate-100">New Case</span>
            </div>
            <svg
              width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#64748b" strokeWidth="1.5"
              className={`transition-transform ${showCreateForm ? 'rotate-180' : ''}`}
            >
              <path d="M3 5l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {showCreateForm && (
            <div className="px-5 py-4 border-t border-slate-800/60" style={{ background: 'rgba(15,23,42,0.6)' }}>
              <CreateCaseForm
                slides={slides}
                onCreated={(c) => {
                  setCases((prev) => [c, ...prev])
                  setShowCreateForm(false)
                }}
              />
            </div>
          )}
        </div>

        {/* Case list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">
              Your Cases
              {cases.length > 0 && (
                <span className="ml-2 font-mono text-[11px] text-slate-600">{cases.length}</span>
              )}
            </h2>
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-600">
              <span>{cases.filter((c) => c.is_published).length} published</span>
              <span>{cases.filter((c) => !c.is_published).length} draft</span>
            </div>
          </div>

          {loadingCases ? (
            <div className="flex items-center justify-center py-16">
              <span className="text-xs text-slate-600 font-mono animate-pulse">Loading cases…</span>
            </div>
          ) : cases.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-xl py-16 text-center"
              style={{ border: '1px dashed rgba(148,163,184,0.12)' }}
            >
              <p className="text-sm text-slate-500 mb-1">No cases yet</p>
              <p className="text-xs text-slate-700">Create your first case above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cases.map((c) => (
                <CaseRow
                  key={c.id}
                  c={c}
                  slides={slides}
                  onUpdated={(updated) =>
                    setCases((prev) =>
                      prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x))
                    )
                  }
                  onDeleted={(id) => setCases((prev) => prev.filter((x) => x.id !== id))}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
