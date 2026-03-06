import { createServerFn } from '@tanstack/react-start'
import { getDB } from './db'
import { getSession } from './session'
import type { Case, CaseForStudent } from './caseFunctions'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CaseSet {
  id: string
  created_by: string
  title: string
  description: string
  class_code: string
  is_active: boolean
  created_at: number
}

export interface CaseSetItem {
  case_set_id: string
  case_id: string
  position: number
}

export interface CaseSetWithCases extends CaseSet {
  cases: (Case | CaseForStudent)[]
}

interface CaseSetRow {
  id: string
  created_by: string
  title: string
  description: string
  class_code: string
  is_active: number
  created_at: number
}

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
  position: number
}

function rowToCaseSet(row: CaseSetRow): CaseSet {
  return { ...row, is_active: row.is_active === 1 }
}

function generateId(): string {
  return crypto.randomUUID()
}

// ─── createCaseSetFn ──────────────────────────────────────────────────────────

interface CreateCaseSetInput {
  title: string
  description?: string
  class_code: string
}

export const createCaseSetFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as CreateCaseSetInput
    if (typeof d?.title !== 'string' || d.title.trim().length < 1) throw new Error('title required')
    if (typeof d?.class_code !== 'string' || d.class_code.trim().length < 1) throw new Error('class_code required')
    return d
  })
  .handler(async ({ data }): Promise<{ ok: boolean; caseSet?: CaseSet; error?: string }> => {
    const db = getDB()
    if (!db) return { ok: false, error: 'Database unavailable' }
    const session = getSession()
    if (!session || session.role !== 'instructor') return { ok: false, error: 'Unauthorized' }

    const id = generateId()
    const now = Math.floor(Date.now() / 1000)
    await db
      .prepare(`
        INSERT INTO case_sets (id, created_by, title, description, class_code, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `)
      .bind(id, session.id, data.title.trim(), data.description?.trim() ?? '', data.class_code.trim().toLowerCase(), now)
      .run()

    const row = await db.prepare('SELECT * FROM case_sets WHERE id = ?').bind(id).first<CaseSetRow>()
    return { ok: true, caseSet: row ? rowToCaseSet(row) : undefined }
  })

// ─── addCaseToCaseSetFn ───────────────────────────────────────────────────────

interface AddCaseInput {
  caseSetId: string
  caseId: string
}

export const addCaseToCaseSetFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as AddCaseInput
    if (typeof d?.caseSetId !== 'string') throw new Error('caseSetId required')
    if (typeof d?.caseId !== 'string') throw new Error('caseId required')
    return d
  })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const db = getDB()
    if (!db) return { ok: false, error: 'Database unavailable' }
    const session = getSession()
    if (!session || session.role !== 'instructor') return { ok: false, error: 'Unauthorized' }

    // Verify ownership of the case set
    const cs = await db
      .prepare('SELECT created_by FROM case_sets WHERE id = ?')
      .bind(data.caseSetId)
      .first<{ created_by: string }>()
    if (!cs || cs.created_by !== session.id) return { ok: false, error: 'Forbidden' }

    // Determine next position
    const maxPos = await db
      .prepare('SELECT MAX(position) as m FROM case_set_items WHERE case_set_id = ?')
      .bind(data.caseSetId)
      .first<{ m: number | null }>()
    const nextPos = (maxPos?.m ?? -1) + 1

    await db
      .prepare('INSERT OR IGNORE INTO case_set_items (case_set_id, case_id, position) VALUES (?, ?, ?)')
      .bind(data.caseSetId, data.caseId, nextPos)
      .run()

    return { ok: true }
  })

// ─── removeCaseFromCaseSetFn ──────────────────────────────────────────────────

interface RemoveCaseInput {
  caseSetId: string
  caseId: string
}

export const removeCaseFromCaseSetFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as RemoveCaseInput
    if (typeof d?.caseSetId !== 'string') throw new Error('caseSetId required')
    if (typeof d?.caseId !== 'string') throw new Error('caseId required')
    return d
  })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const db = getDB()
    if (!db) return { ok: false, error: 'Database unavailable' }
    const session = getSession()
    if (!session || session.role !== 'instructor') return { ok: false, error: 'Unauthorized' }

    const cs = await db
      .prepare('SELECT created_by FROM case_sets WHERE id = ?')
      .bind(data.caseSetId)
      .first<{ created_by: string }>()
    if (!cs || cs.created_by !== session.id) return { ok: false, error: 'Forbidden' }

    await db
      .prepare('DELETE FROM case_set_items WHERE case_set_id = ? AND case_id = ?')
      .bind(data.caseSetId, data.caseId)
      .run()

    return { ok: true }
  })

// ─── reorderCaseSetFn ─────────────────────────────────────────────────────────

interface ReorderInput {
  caseSetId: string
  orderedCaseIds: string[]
}

export const reorderCaseSetFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as ReorderInput
    if (typeof d?.caseSetId !== 'string') throw new Error('caseSetId required')
    if (!Array.isArray(d?.orderedCaseIds)) throw new Error('orderedCaseIds required')
    return d
  })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const db = getDB()
    if (!db) return { ok: false, error: 'Database unavailable' }
    const session = getSession()
    if (!session || session.role !== 'instructor') return { ok: false, error: 'Unauthorized' }

    const cs = await db
      .prepare('SELECT created_by FROM case_sets WHERE id = ?')
      .bind(data.caseSetId)
      .first<{ created_by: string }>()
    if (!cs || cs.created_by !== session.id) return { ok: false, error: 'Forbidden' }

    const stmts = data.orderedCaseIds.map((caseId, idx) =>
      db
        .prepare('UPDATE case_set_items SET position = ? WHERE case_set_id = ? AND case_id = ?')
        .bind(idx, data.caseSetId, caseId)
    )
    if (stmts.length > 0) await db.batch(stmts)
    return { ok: true }
  })

// ─── listCaseSetsFn ───────────────────────────────────────────────────────────

export const listCaseSetsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => data)
  .handler(async (): Promise<CaseSet[]> => {
    const db = getDB()
    if (!db) return []
    const session = getSession()
    if (!session) return []

    if (session.role === 'instructor') {
      const result = await db
        .prepare('SELECT * FROM case_sets WHERE created_by = ? ORDER BY created_at DESC')
        .bind(session.id)
        .all<CaseSetRow>()
      return (result.results ?? []).map(rowToCaseSet)
    }

    // Students: only sets matching their class code
    if (!session.class_code) return []
    const result = await db
      .prepare('SELECT * FROM case_sets WHERE class_code = ? AND is_active = 1 ORDER BY created_at DESC')
      .bind(session.class_code)
      .all<CaseSetRow>()
    return (result.results ?? []).map(rowToCaseSet)
  })

// ─── getCaseSetWithCasesFn ────────────────────────────────────────────────────

export const getCaseSetWithCasesFn = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => {
    if (typeof data !== 'string') throw new Error('caseSetId required')
    return data
  })
  .handler(async ({ data: caseSetId }): Promise<CaseSetWithCases | null> => {
    const db = getDB()
    if (!db) return null
    const session = getSession()
    if (!session) return null

    const row = await db
      .prepare('SELECT * FROM case_sets WHERE id = ?')
      .bind(caseSetId)
      .first<CaseSetRow>()
    if (!row) return null

    // Students can only view sets matching their class code
    if (session.role === 'student' && row.class_code !== session.class_code) return null

    const caseResult = await db
      .prepare(`
        SELECT c.*, csi.position
        FROM cases c
        JOIN case_set_items csi ON csi.case_id = c.id
        WHERE csi.case_set_id = ?
        ORDER BY csi.position ASC
      `)
      .bind(caseSetId)
      .all<CaseRow>()

    const cases = (caseResult.results ?? []).map((r): Case | CaseForStudent => {
      const base = {
        id: r.id,
        slide_id: r.slide_id,
        created_by: r.created_by,
        title: r.title,
        clinical_description: r.clinical_description,
        difficulty: r.difficulty,
        is_published: r.is_published === 1,
        created_at: r.created_at,
        updated_at: r.updated_at,
      }
      if (session.role === 'instructor') return { ...base, diagnosis: r.diagnosis }
      return base as CaseForStudent
    })

    return { ...rowToCaseSet(row), cases }
  })

// ─── deleteCaseSetFn ──────────────────────────────────────────────────────────

export const deleteCaseSetFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (typeof data !== 'string') throw new Error('caseSetId required')
    return data
  })
  .handler(async ({ data: caseSetId }): Promise<{ ok: boolean; error?: string }> => {
    const db = getDB()
    if (!db) return { ok: false, error: 'Database unavailable' }
    const session = getSession()
    if (!session || session.role !== 'instructor') return { ok: false, error: 'Unauthorized' }

    const cs = await db
      .prepare('SELECT created_by FROM case_sets WHERE id = ?')
      .bind(caseSetId)
      .first<{ created_by: string }>()
    if (!cs || cs.created_by !== session.id) return { ok: false, error: 'Forbidden' }

    await db.prepare('DELETE FROM case_sets WHERE id = ?').bind(caseSetId).run()
    return { ok: true }
  })
