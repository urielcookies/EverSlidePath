import { useState } from 'react'
import { toast } from 'sonner'
import {
  usePathologyStore,
  setShowGroundTruth,
  setGroundTruthAnnotations,
  setSubmissionState,
} from '../../store/pathologyStore'
import { useAuthStore } from '../../store/authStore'
import { submitCaseFn } from '../../server/progressFunctions'
import { getGroundTruthAnnotationsFn } from '../../server/caseFunctions'

const DIFFICULTY_CONFIG = {
  beginner:     { label: 'Beginner',     color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
  intermediate: { label: 'Intermediate', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  advanced:     { label: 'Advanced',     color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
} as const

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="border-b border-slate-800/60 px-3 py-2">
      <span className="pv-label tracking-widest">{label}</span>
    </div>
  )
}

export default function CaseContextPanel() {
  const activeCase      = usePathologyStore((s) => s.activeCase)
  const activeCaseId    = usePathologyStore((s) => s.activeCaseId)
  const isSubmitted     = usePathologyStore((s) => s.isSubmitted)
  const revealedDiagnosis = usePathologyStore((s) => s.revealedDiagnosis)
  const showGroundTruth = usePathologyStore((s) => s.showGroundTruth)
  const groundTruthAnnotations = usePathologyStore((s) => s.groundTruthAnnotations)
  const user = useAuthStore((s) => s.user)

  const [diagnosisRevealed, setDiagnosisRevealed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!activeCase) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-4 py-8 text-center">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="mb-3 opacity-20">
          <rect x="3" y="3" width="22" height="22" rx="3" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="14" cy="14" r="5" stroke="#94a3b8" strokeWidth="1.5" />
          <circle cx="14" cy="14" r="1.5" fill="#94a3b8" />
        </svg>
        <p className="text-[11px] text-slate-600">No case loaded.</p>
        <p className="text-[10px] text-slate-700 mt-1">Open a case from the Dashboard.</p>
      </div>
    )
  }

  const difficulty = activeCase.difficulty
  const diffCfg = DIFFICULTY_CONFIG[difficulty]
  const isStudent = user?.role === 'student'
  const isInstructor = user?.role === 'instructor'

  const handleSubmit = async () => {
    if (!activeCaseId) return
    setSubmitting(true)
    try {
      const result = await submitCaseFn({ data: { caseId: activeCaseId } })
      if (!result.ok) {
        toast.error(result.error ?? 'Submission failed')
        return
      }
      setSubmissionState(true, Date.now(), result.diagnosis ?? null)
      toast.success('Case submitted! Diagnosis revealed below.')
      setConfirmOpen(false)

      // Load ground truth annotations from instructor
      if (activeCaseId) {
        getGroundTruthAnnotationsFn({ data: activeCaseId })
          .then((anns) => {
            setGroundTruthAnnotations(anns)
          })
          .catch(() => {})
      }
    } catch {
      toast.error('Submission failed — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleGroundTruth = () => {
    setShowGroundTruth(!showGroundTruth)
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">

      {/* ── Case header ────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800/60">
        <SectionHeader label="Case Info" />
        <div className="px-3 py-3 space-y-2.5">
          <h2 className="text-xs font-semibold text-slate-100 leading-snug">{activeCase.title}</h2>
          <span
            className="inline-flex items-center rounded px-1.5 py-px text-[10px] font-medium font-mono"
            style={{ color: diffCfg.color, background: diffCfg.bg, border: `1px solid ${diffCfg.border}` }}
          >
            {diffCfg.label}
          </span>
        </div>
      </div>

      {/* ── Clinical description ───────────────────────────────────────────── */}
      <div className="border-b border-slate-800/60">
        <SectionHeader label="Clinical Description" />
        <div className="px-3 py-3">
          {activeCase.clinical_description ? (
            <p className="text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap">
              {activeCase.clinical_description}
            </p>
          ) : (
            <p className="text-[11px] text-slate-700 italic">No clinical description provided.</p>
          )}
        </div>
      </div>

      {/* ── Submission (students only) ─────────────────────────────────────── */}
      {isStudent && (
        <div className="border-b border-slate-800/60">
          <SectionHeader label="Assessment" />
          <div className="px-3 py-3 space-y-3">
            {!isSubmitted ? (
              <>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  When you're done annotating, submit your case to reveal the diagnosis and compare with the instructor's ground truth.
                </p>

                {!confirmOpen ? (
                  <button
                    onClick={() => setConfirmOpen(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-md py-2 text-xs font-semibold text-[#020617] transition-all hover:brightness-110"
                    style={{ background: '#22d3ee' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M4 6l1.5 1.5L8 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Submit Case
                  </button>
                ) : (
                  <div
                    className="rounded-lg p-3 space-y-2.5"
                    style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}
                  >
                    <p className="text-[11px] text-red-300 leading-snug">
                      Submit your annotations? This is permanent — you won't be able to add more annotations after submission.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmOpen(false)}
                        className="flex-1 rounded py-1.5 text-[11px] text-slate-400 hover:text-slate-200 border border-slate-700/50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 rounded py-1.5 text-[11px] font-semibold text-[#020617] transition-all hover:brightness-110 disabled:opacity-50"
                        style={{ background: '#f87171' }}
                      >
                        {submitting ? 'Submitting…' : 'Confirm Submit'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                {/* Submitted state */}
                <div
                  className="flex items-center gap-2 rounded-md px-3 py-2"
                  style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="6" cy="6" r="5" fill="rgba(52,211,153,0.15)" stroke="#34d399" strokeWidth="1" />
                    <path d="M3.5 6l2 2L8.5 4" stroke="#34d399" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[11px] text-emerald-400 font-medium">Case submitted</span>
                  {submittedAtLabel(usePathologyStore.getState?.()?.submittedAt ?? null)}
                </div>

                {/* Annotations locked indicator */}
                <div
                  className="flex items-center gap-1.5 rounded px-2 py-1.5"
                  style={{ background: 'rgba(71,85,105,0.15)', border: '1px solid rgba(71,85,105,0.25)' }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#475569" strokeWidth="1.3">
                    <rect x="2" y="4.5" width="6" height="4.5" rx="1" />
                    <path d="M3.5 4.5V3a1.5 1.5 0 0 1 3 0v1.5" />
                  </svg>
                  <span className="text-[10px] text-slate-600 font-mono">Annotations locked — read only</span>
                </div>

                {/* Diagnosis reveal */}
                {revealedDiagnosis !== null && (
                  <div>
                    <span className="pv-label text-[10px] tracking-widest">Diagnosis</span>
                    <div
                      className="mt-1.5 rounded-md px-3 py-2 relative overflow-hidden cursor-pointer"
                      style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(148,163,184,0.12)' }}
                      onClick={() => setDiagnosisRevealed(true)}
                    >
                      <p
                        className="text-xs text-slate-200 leading-relaxed transition-all duration-300"
                        style={!diagnosisRevealed ? { filter: 'blur(5px)', userSelect: 'none' } : {}}
                      >
                        {revealedDiagnosis || <span className="text-slate-600 italic">No diagnosis provided.</span>}
                      </p>
                      {!diagnosisRevealed && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] text-slate-400 font-medium">Click to reveal</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Ground truth (available after submission for students, always for instructors) ── */}
      {(isSubmitted || isInstructor) && (
        <div className="border-b border-slate-800/60">
          <SectionHeader label="Ground Truth" />
          <div className="px-3 py-3 space-y-2">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Toggle the instructor's reference annotations to compare with yours.
            </p>
            <button
              onClick={handleToggleGroundTruth}
              className="w-full flex items-center justify-between rounded-md px-3 py-2 text-[11px] font-medium transition-all"
              style={
                showGroundTruth
                  ? { background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.25)', color: '#22d3ee' }
                  : { background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(71,85,105,0.4)', color: '#64748b' }
              }
            >
              <span>{showGroundTruth ? 'Hide Ground Truth' : 'Show Ground Truth'}</span>
              <span className="font-mono text-[10px]">
                {groundTruthAnnotations.length} annotations
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── Instructor note ────────────────────────────────────────────────── */}
      {isInstructor && (
        <div>
          <SectionHeader label="Instructor View" />
          <div className="px-3 py-3">
            <p className="text-[11px] text-slate-600 leading-relaxed">
              You are viewing this case as an instructor. Student annotations are scoped per user and are not visible here.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper — formatted submitted-at time
function submittedAtLabel(ts: number | null): React.ReactNode {
  if (!ts) return null
  const time = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return <span className="font-mono text-[9px] text-slate-600 ml-auto">{time}</span>
}
