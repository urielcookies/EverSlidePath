import { createServerFn } from '@tanstack/react-start'
import { getDB } from './db'
import { getSession } from './session'
import { LABEL_COLOR_MAP } from '../lib/annotationConfig'
import type { Annotation, AnnotationLabel, AnnotationShape } from '../store/pathologyStore'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Case {
  id: string
  slide_id: string
  created_by: string
  title: string
  clinical_description: string
  diagnosis: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  is_published: boolean
  created_at: number
  updated_at: number
}

export type CaseForStudent = Omit<Case, 'diagnosis'>

interface CaseRow {
  id: string
  slide_id: string
  created_by: string
  title: string
  clinical_description: string
  diagnosis: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  is_published: number
  created_at: number
  updated_at: number
}

function rowToCase(row: CaseRow): Case {
  return {
    ...row,
    is_published: row.is_published === 1,
  }
}

function generateId(): string {
  return crypto.randomUUID()
}

// ─── createCaseFn ─────────────────────────────────────────────────────────────

interface CreateCaseInput {
  slide_id: string
  title: string
  clinical_description?: string
  diagnosis?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
}

export const createCaseFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as CreateCaseInput
    if (typeof d?.slide_id !== 'string') throw new Error('slide_id required')
    if (typeof d?.title !== 'string' || d.title.trim().length < 1) throw new Error('title required')
    return d
  })
  .handler(async ({ data }): Promise<{ ok: boolean; case?: Case; error?: string }> => {
    const db = getDB()
    if (!db) return { ok: false, error: 'Database unavailable' }
    const session = getSession()
    if (!session || session.role !== 'instructor') return { ok: false, error: 'Unauthorized' }

    const id = generateId()
    const now = Math.floor(Date.now() / 1000)
    await db
      .prepare(`
        INSERT INTO cases (id, slide_id, created_by, title, clinical_description, diagnosis, difficulty, is_published, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `)
      .bind(
        id,
        data.slide_id,
        session.id,
        data.title.trim(),
        data.clinical_description?.trim() ?? '',
        data.diagnosis?.trim() ?? '',
        data.difficulty ?? 'intermediate',
        now,
        now,
      )
      .run()

    const row = await db.prepare('SELECT * FROM cases WHERE id = ?').bind(id).first<CaseRow>()
    return { ok: true, case: row ? rowToCase(row) : undefined }
  })

// ─── getCaseFn ────────────────────────────────────────────────────────────────

export const getCaseFn = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => {
    if (typeof data !== 'string') throw new Error('case id required')
    return data
  })
  .handler(async ({ data: caseId }): Promise<Case | CaseForStudent | null> => {
    const db = getDB()
    if (!db) return null
    const row = await db.prepare('SELECT * FROM cases WHERE id = ?').bind(caseId).first<CaseRow>()
    if (!row) return null

    const c = rowToCase(row)
    const session = getSession()

    // Hide diagnosis for students (or unauthenticated) unless submitted — Phase 4 will gate on submission
    if (!session || session.role === 'student') {
      const { diagnosis: _d, ...rest } = c
      return rest as CaseForStudent
    }

    return c
  })

// ─── listCasesFn ──────────────────────────────────────────────────────────────

export const listCasesFn = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => data)
  .handler(async (): Promise<Case[]> => {
    const db = getDB()
    if (!db) return []
    const session = getSession()
    if (!session) return []

    let query: string
    let binds: unknown[]

    if (session.role === 'instructor') {
      // Instructors see all their own cases
      query = 'SELECT * FROM cases WHERE created_by = ? ORDER BY created_at DESC'
      binds = [session.id]
    } else {
      // Students see published cases only
      query = 'SELECT * FROM cases WHERE is_published = 1 ORDER BY created_at DESC'
      binds = []
    }

    const result = await db.prepare(query).bind(...binds).all<CaseRow>()
    const cases = (result.results ?? []).map(rowToCase)

    // Strip diagnosis for students
    if (session.role === 'student') {
      return cases.map(({ diagnosis: _d, ...rest }) => rest as Case)
    }

    return cases
  })

// ─── updateCaseFn ─────────────────────────────────────────────────────────────

interface UpdateCaseInput {
  id: string
  title?: string
  clinical_description?: string
  diagnosis?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  is_published?: boolean
}

export const updateCaseFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as UpdateCaseInput
    if (typeof d?.id !== 'string') throw new Error('id required')
    return d
  })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const db = getDB()
    if (!db) return { ok: false, error: 'Database unavailable' }
    const session = getSession()
    if (!session || session.role !== 'instructor') return { ok: false, error: 'Unauthorized' }

    const existing = await db
      .prepare('SELECT id, created_by FROM cases WHERE id = ?')
      .bind(data.id)
      .first<{ id: string; created_by: string }>()
    if (!existing) return { ok: false, error: 'Case not found' }
    if (existing.created_by !== session.id) return { ok: false, error: 'Forbidden' }

    const fields: string[] = []
    const values: unknown[] = []

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title.trim()) }
    if (data.clinical_description !== undefined) { fields.push('clinical_description = ?'); values.push(data.clinical_description.trim()) }
    if (data.diagnosis !== undefined) { fields.push('diagnosis = ?'); values.push(data.diagnosis.trim()) }
    if (data.difficulty !== undefined) { fields.push('difficulty = ?'); values.push(data.difficulty) }
    if (data.is_published !== undefined) { fields.push('is_published = ?'); values.push(data.is_published ? 1 : 0) }

    if (fields.length === 0) return { ok: true }

    fields.push('updated_at = ?')
    values.push(Math.floor(Date.now() / 1000))
    values.push(data.id)

    await db
      .prepare(`UPDATE cases SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run()

    return { ok: true }
  })

// ─── deleteCaseFn ─────────────────────────────────────────────────────────────

export const deleteCaseFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (typeof data !== 'string') throw new Error('case id required')
    return data
  })
  .handler(async ({ data: caseId }): Promise<{ ok: boolean; error?: string }> => {
    const db = getDB()
    if (!db) return { ok: false, error: 'Database unavailable' }
    const session = getSession()
    if (!session || session.role !== 'instructor') return { ok: false, error: 'Unauthorized' }

    const existing = await db
      .prepare('SELECT created_by FROM cases WHERE id = ?')
      .bind(caseId)
      .first<{ created_by: string }>()
    if (!existing) return { ok: false, error: 'Case not found' }
    if (existing.created_by !== session.id) return { ok: false, error: 'Forbidden' }

    await db.prepare('DELETE FROM cases WHERE id = ?').bind(caseId).run()
    return { ok: true }
  })

// ─── getGroundTruthAnnotationsFn ──────────────────────────────────────────────

interface AnnotationRow {
  id: string
  slide_id: string
  type: string
  label: string
  x: number
  y: number
  shape: string | null
  radius: number | null
  color: string | null
  points_json: string | null
  name: string | null
  created_at: number
}

function rowToAnnotation(row: AnnotationRow): Annotation {
  const label = row.label as AnnotationLabel
  const shape = (row.shape ?? 'circle') as AnnotationShape
  let points: { x: number; y: number }[] | undefined
  if (row.points_json) {
    try { points = JSON.parse(row.points_json) } catch { /* ignore */ }
  }
  return {
    id: row.id,
    type: 'point',
    shape,
    imageCoords: { x: row.x, y: row.y },
    radius: row.radius ?? 20,
    points,
    label,
    name: row.name ?? undefined,
    color: row.color ?? LABEL_COLOR_MAP[label] ?? '#94a3b8',
    createdAt: row.created_at,
  }
}

export const getGroundTruthAnnotationsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => {
    if (typeof data !== 'string') throw new Error('case id required')
    return data
  })
  .handler(async ({ data: caseId }): Promise<Annotation[]> => {
    const db = getDB()
    if (!db) return []
    const session = getSession()
    if (!session || session.role !== 'instructor') return []

    const result = await db
      .prepare(`
        SELECT * FROM annotations
        WHERE case_id = ? AND is_ground_truth = 1
        ORDER BY created_at ASC
      `)
      .bind(caseId)
      .all<AnnotationRow>()

    return (result.results ?? []).map(rowToAnnotation)
  })

// ─── saveGroundTruthAnnotationsFn ─────────────────────────────────────────────

interface SaveGroundTruthInput {
  caseId: string
  slideId: string
  annotations: Annotation[]
}

export const saveGroundTruthAnnotationsFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as SaveGroundTruthInput
    if (typeof d?.caseId !== 'string') throw new Error('caseId required')
    if (typeof d?.slideId !== 'string') throw new Error('slideId required')
    if (!Array.isArray(d?.annotations)) throw new Error('annotations must be array')
    return d
  })
  .handler(async ({ data }): Promise<{ ok: boolean; saved: number }> => {
    const db = getDB()
    if (!db) return { ok: false, saved: 0 }
    const session = getSession()
    if (!session || session.role !== 'instructor') return { ok: false, saved: 0 }

    // Verify case ownership
    const existing = await db
      .prepare('SELECT created_by FROM cases WHERE id = ?')
      .bind(data.caseId)
      .first<{ created_by: string }>()
    if (!existing || existing.created_by !== session.id) return { ok: false, saved: 0 }

    // Delete existing ground truth for this case then re-insert
    await db
      .prepare('DELETE FROM annotations WHERE case_id = ? AND is_ground_truth = 1')
      .bind(data.caseId)
      .run()

    if (data.annotations.length === 0) return { ok: true, saved: 0 }

    const stmts = data.annotations.map((ann) =>
      db.prepare(`
        INSERT INTO annotations
          (id, slide_id, type, label, x, y, shape, radius, color, points_json, name, case_id, is_ground_truth, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).bind(
        ann.id,
        data.slideId,
        ann.type,
        ann.label,
        ann.imageCoords.x,
        ann.imageCoords.y,
        ann.shape ?? 'circle',
        ann.radius ?? 20,
        ann.color,
        ann.points ? JSON.stringify(ann.points) : null,
        ann.name ?? null,
        data.caseId,
        session.id,
        ann.createdAt,
      )
    )

    await db.batch(stmts)
    return { ok: true, saved: data.annotations.length }
  })
