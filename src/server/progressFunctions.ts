import { createServerFn } from '@tanstack/react-start'
import { getDB } from './db'
import { getSession } from './session'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProgressStatus = 'not_started' | 'in_progress' | 'submitted'

export interface StudentProgress {
  id: string
  user_id: string
  case_id: string
  case_set_id: string | null
  started_at: number | null
  completed_at: number | null
  status: ProgressStatus
}

interface ProgressRow {
  id: string
  user_id: string
  case_id: string
  case_set_id: string | null
  started_at: number | null
  completed_at: number | null
  status: ProgressStatus
}

function generateId(): string {
  return crypto.randomUUID()
}

// ─── upsertProgressFn ─────────────────────────────────────────────────────────
// Called when a student opens a case — sets status to 'in_progress' if not yet submitted.

interface UpsertProgressInput {
  caseId: string
  caseSetId?: string | null
}

export const upsertProgressFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as UpsertProgressInput
    if (typeof d?.caseId !== 'string') throw new Error('caseId required')
    return d
  })
  .handler(async ({ data }): Promise<{ ok: boolean; progress?: StudentProgress }> => {
    const db = getDB()
    if (!db) return { ok: false }
    const session = getSession()
    if (!session || session.role !== 'student') return { ok: false }

    const now = Math.floor(Date.now() / 1000)
    const existing = await db
      .prepare('SELECT * FROM student_progress WHERE user_id = ? AND case_id = ?')
      .bind(session.id, data.caseId)
      .first<ProgressRow>()

    if (existing) {
      // Already submitted — don't regress status
      if (existing.status === 'submitted') {
        return { ok: true, progress: existing }
      }
      // Update to in_progress if still at not_started
      await db
        .prepare(`
          UPDATE student_progress
          SET status = 'in_progress', started_at = COALESCE(started_at, ?), case_set_id = COALESCE(case_set_id, ?)
          WHERE user_id = ? AND case_id = ?
        `)
        .bind(now, data.caseSetId ?? null, session.id, data.caseId)
        .run()
    } else {
      // First open — insert as in_progress
      await db
        .prepare(`
          INSERT INTO student_progress (id, user_id, case_id, case_set_id, started_at, status)
          VALUES (?, ?, ?, ?, ?, 'in_progress')
        `)
        .bind(generateId(), session.id, data.caseId, data.caseSetId ?? null, now)
        .run()
    }

    const updated = await db
      .prepare('SELECT * FROM student_progress WHERE user_id = ? AND case_id = ?')
      .bind(session.id, data.caseId)
      .first<ProgressRow>()

    return { ok: true, progress: updated ?? undefined }
  })

// ─── getMyProgressFn ──────────────────────────────────────────────────────────
// Returns all progress records for the current student.

export const getMyProgressFn = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => data)
  .handler(async (): Promise<StudentProgress[]> => {
    const db = getDB()
    if (!db) return []
    const session = getSession()
    if (!session || session.role !== 'student') return []

    const result = await db
      .prepare('SELECT * FROM student_progress WHERE user_id = ? ORDER BY started_at DESC')
      .bind(session.id)
      .all<ProgressRow>()

    return result.results ?? []
  })

// ─── submitCaseFn ─────────────────────────────────────────────────────────────
// Locks annotations and marks the case as submitted for the student. Phase 4.

interface SubmitCaseInput {
  caseId: string
}

export const submitCaseFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as SubmitCaseInput
    if (typeof d?.caseId !== 'string') throw new Error('caseId required')
    return d
  })
  .handler(async ({ data }): Promise<{ ok: boolean; diagnosis?: string; error?: string }> => {
    const db = getDB()
    if (!db) return { ok: false, error: 'Database unavailable' }
    const session = getSession()
    if (!session || session.role !== 'student') return { ok: false, error: 'Unauthorized' }

    const now = Math.floor(Date.now() / 1000)

    // Mark submitted
    await db
      .prepare(`
        UPDATE student_progress
        SET status = 'submitted', completed_at = ?
        WHERE user_id = ? AND case_id = ?
      `)
      .bind(now, session.id, data.caseId)
      .run()

    // Return diagnosis for reveal
    const caseRow = await db
      .prepare('SELECT diagnosis FROM cases WHERE id = ?')
      .bind(data.caseId)
      .first<{ diagnosis: string }>()

    return { ok: true, diagnosis: caseRow?.diagnosis ?? '' }
  })

// ─── getSubmissionStatusFn ────────────────────────────────────────────────────

export const getSubmissionStatusFn = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => {
    if (typeof data !== 'string') throw new Error('caseId required')
    return data
  })
  .handler(async ({ data: caseId }): Promise<StudentProgress | null> => {
    const db = getDB()
    if (!db) return null
    const session = getSession()
    if (!session) return null

    const row = await db
      .prepare('SELECT * FROM student_progress WHERE user_id = ? AND case_id = ?')
      .bind(session.id, caseId)
      .first<ProgressRow>()

    return row ?? null
  })

// ─── getInstructorProgressSummaryFn ──────────────────────────────────────────
// Returns per-student progress for all cases in a case set. Phase 4 / Phase 5.

interface ProgressSummaryRow {
  user_id: string
  display_name: string
  case_id: string
  case_title: string
  status: ProgressStatus
  started_at: number | null
  completed_at: number | null
}

export interface ProgressSummary {
  user_id: string
  display_name: string
  case_id: string
  case_title: string
  status: ProgressStatus
  started_at: number | null
  completed_at: number | null
}

export const getInstructorProgressSummaryFn = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => {
    if (typeof data !== 'string') throw new Error('caseSetId required')
    return data
  })
  .handler(async ({ data: caseSetId }): Promise<ProgressSummary[]> => {
    const db = getDB()
    if (!db) return []
    const session = getSession()
    if (!session || session.role !== 'instructor') return []

    // Verify ownership
    const cs = await db
      .prepare('SELECT created_by FROM case_sets WHERE id = ?')
      .bind(caseSetId)
      .first<{ created_by: string }>()
    if (!cs || cs.created_by !== session.id) return []

    const result = await db
      .prepare(`
        SELECT
          sp.user_id,
          u.display_name,
          sp.case_id,
          c.title  AS case_title,
          sp.status,
          sp.started_at,
          sp.completed_at
        FROM student_progress sp
        JOIN users u  ON u.id  = sp.user_id
        JOIN cases c  ON c.id  = sp.case_id
        WHERE sp.case_set_id = ?
        ORDER BY u.display_name, sp.case_id
      `)
      .bind(caseSetId)
      .all<ProgressSummaryRow>()

    return result.results ?? []
  })
