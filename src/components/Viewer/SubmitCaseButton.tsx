import { useState } from 'react'
import { toast } from 'sonner'
import { usePathologyStore, setSubmissionState, setGroundTruthAnnotations } from '../../store/pathologyStore'
import { useAuthStore } from '../../store/authStore'
import { submitCaseFn } from '../../server/progressFunctions'
import { getGroundTruthAnnotationsFn } from '../../server/caseFunctions'

/**
 * Top-bar submit button — only renders when a student has an active case
 * that has not yet been submitted. Uses the same 2-step confirm pattern as
 * the existing "Clear All" button.
 */
export default function SubmitCaseButton() {
  const activeCaseId = usePathologyStore((s) => s.activeCaseId)
  const isSubmitted  = usePathologyStore((s) => s.isSubmitted)
  const user         = useAuthStore((s) => s.user)

  const [confirm, setConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Only visible for students with an active, unsubmitted case
  if (!activeCaseId || !user || user.role !== 'student' || isSubmitted) return null

  const handleClick = async () => {
    if (!confirm) {
      setConfirm(true)
      setTimeout(() => setConfirm(false), 2500)
      return
    }

    setSubmitting(true)
    try {
      const result = await submitCaseFn({ data: { caseId: activeCaseId } })
      if (!result.ok) {
        toast.error(result.error ?? 'Submission failed')
        setConfirm(false)
        return
      }
      setSubmissionState(true, Date.now(), result.diagnosis ?? null)
      toast.success('Case submitted! Check the Case tab to reveal the diagnosis.')
      setConfirm(false)

      // Eagerly load ground truth so the toggle is ready immediately
      getGroundTruthAnnotationsFn({ data: activeCaseId })
        .then(setGroundTruthAnnotations)
        .catch(() => {})
    } catch {
      toast.error('Submission failed — please try again')
      setConfirm(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={submitting}
      className="flex h-6 items-center gap-1.5 rounded border px-2 text-[10px] font-mono font-semibold transition-all disabled:opacity-50"
      style={
        confirm
          ? { background: 'rgba(248,113,113,0.15)', borderColor: 'rgba(248,113,113,0.4)', color: '#f87171' }
          : { background: 'rgba(34,211,238,0.08)', borderColor: 'rgba(34,211,238,0.25)', color: '#22d3ee' }
      }
      title={confirm ? 'Click again to confirm submission' : 'Submit this case'}
    >
      {submitting ? (
        <svg className="animate-spin" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="5" cy="5" r="3.5" strokeOpacity="0.2" />
          <path d="M5 1.5a3.5 3.5 0 0 1 3.5 3.5" />
        </svg>
      ) : confirm ? (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.3" />
          <path d="M3 5l1.5 1.5L7 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {submitting ? 'Submitting…' : confirm ? 'Confirm?' : 'Submit Case'}
    </button>
  )
}
