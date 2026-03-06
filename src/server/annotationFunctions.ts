import { createServerFn } from '@tanstack/react-start'
import { getDB } from './db'
import { LABEL_COLOR_MAP } from '../lib/annotationConfig'
import type { Annotation, AnnotationLabel, AnnotationShape } from '../store/pathologyStore'

// ─── DB row shape ─────────────────────────────────────────────────────────────
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
  confidence: number | null
  session_metadata_json: string | null
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

// ─── getAnnotations ───────────────────────────────────────────────────────────
interface GetAnnotationsInput {
  slideId: string
  caseId?: string | null
  userId?: string | null
}

export const getAnnotationsFn = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => {
    // Accept either a plain slideId string (legacy) or the new { slideId, caseId, userId } shape
    if (typeof data === 'string') return { slideId: data, caseId: null, userId: null } as GetAnnotationsInput
    const d = data as GetAnnotationsInput
    if (typeof d?.slideId !== 'string') throw new Error('slideId must be a string')
    return { slideId: d.slideId, caseId: d.caseId ?? null, userId: d.userId ?? null }
  })
  .handler(async ({ data }): Promise<Annotation[]> => {
    const db = getDB()
    if (!db) return []

    // Case-scoped query: fetch annotations for a specific user+case (student workflow)
    if (data.caseId && data.userId) {
      const result = await db
        .prepare(`
          SELECT * FROM annotations
          WHERE slide_id = ? AND case_id = ? AND user_id = ? AND is_ground_truth = 0
          ORDER BY created_at ASC
        `)
        .bind(data.slideId, data.caseId, data.userId)
        .all<AnnotationRow>()
      return (result.results ?? []).map(rowToAnnotation)
    }

    // Anonymous / legacy flow: global annotations with no case scope
    const result = await db
      .prepare('SELECT * FROM annotations WHERE slide_id = ? AND case_id IS NULL ORDER BY created_at ASC')
      .bind(data.slideId)
      .all<AnnotationRow>()
    return (result.results ?? []).map(rowToAnnotation)
  })

// ─── saveAnnotations (bulk upsert) ───────────────────────────────────────────
interface SaveAnnotationsInput {
  slideId: string
  annotations: Annotation[]
  sessionMeta?: { threshold: number; inferenceMs: number } | null
  caseId?: string | null
  userId?: string | null
}

export const saveAnnotationsFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as SaveAnnotationsInput
    if (typeof d?.slideId !== 'string') throw new Error('slideId required')
    if (!Array.isArray(d?.annotations)) throw new Error('annotations must be array')
    return d
  })
  .handler(async ({ data }): Promise<{ ok: boolean; saved: number }> => {
    const db = getDB()
    if (!db) return { ok: false, saved: 0 }
    if (data.annotations.length === 0) return { ok: true, saved: 0 }

    const sessionJson = data.sessionMeta ? JSON.stringify(data.sessionMeta) : null
    const caseId = data.caseId ?? null
    const userId = data.userId ?? null

    // Ensure slide row exists
    await db
      .prepare(`INSERT OR IGNORE INTO slides (id, name, metadata_json) VALUES (?, ?, ?)`)
      .bind(data.slideId, data.slideId, '{}')
      .run()

    // Bulk upsert — D1 batch limit is 100 statements; chunk accordingly
    const stmts = data.annotations.map((ann) =>
      db.prepare(`
        INSERT INTO annotations (id, slide_id, type, label, x, y, shape, radius, color, points_json, name, confidence, session_metadata_json, case_id, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          label       = excluded.label,
          x           = excluded.x,
          y           = excluded.y,
          shape       = excluded.shape,
          radius      = excluded.radius,
          color       = excluded.color,
          points_json = excluded.points_json,
          name        = excluded.name,
          confidence  = excluded.confidence
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
        null,
        sessionJson,
        caseId,
        userId,
        ann.createdAt,
      )
    )

    const CHUNK = 100
    for (let i = 0; i < stmts.length; i += CHUNK) {
      await db.batch(stmts.slice(i, i + CHUNK))
    }
    return { ok: true, saved: data.annotations.length }
  })

// ─── deleteAnnotation ─────────────────────────────────────────────────────────
export const deleteAnnotationFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as { id: string }
    if (typeof d?.id !== 'string') throw new Error('id required')
    return d
  })
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = getDB()
    if (!db) return { ok: false }
    await db.prepare('DELETE FROM annotations WHERE id = ?').bind(data.id).run()
    return { ok: true }
  })

// ─── seedDemoAnnotations ──────────────────────────────────────────────────────
// Inserts 10 fixed-coordinate demo markers if the slide currently has 0 annotations.
const DEMO_ANNOTATIONS = [
  { id: 'demo-001', label: 'Tumor',   x: 5800,  y: 3200 },
  { id: 'demo-002', label: 'Stroma',  x: 9400,  y: 5100 },
  { id: 'demo-003', label: 'Immune',  x: 12300, y: 7800 },
  { id: 'demo-004', label: 'Tumor',   x: 16700, y: 4500 },
  { id: 'demo-005', label: 'Vessel',  x: 20100, y: 9300 },
  { id: 'demo-006', label: 'Necrosis',x: 24500, y: 6200 },
  { id: 'demo-007', label: 'Tumor',   x: 28900, y: 11400 },
  { id: 'demo-008', label: 'Immune',  x: 33200, y: 8700 },
  { id: 'demo-009', label: 'Stroma',  x: 37600, y: 14100 },
  { id: 'demo-010', label: 'Vessel',  x: 41800, y: 10600 },
] as const

export const seedDemoAnnotationsFn = createServerFn({ method: 'POST' })
  .inputValidator((slideId: unknown) => {
    if (typeof slideId !== 'string') throw new Error('slideId required')
    return slideId
  })
  .handler(async ({ data: slideId }): Promise<{ ok: boolean; seeded: number }> => {
    const db = getDB()
    if (!db) return { ok: false, seeded: 0 }

    // Check existing count — only seed if empty
    const countRow = await db
      .prepare('SELECT COUNT(*) as cnt FROM annotations WHERE slide_id = ?')
      .bind(slideId)
      .first<{ cnt: number }>()

    if ((countRow?.cnt ?? 0) > 0) return { ok: true, seeded: 0 }

    // Ensure slide row exists
    await db
      .prepare(`INSERT OR IGNORE INTO slides (id, name, metadata_json) VALUES (?, ?, ?)`)
      .bind(slideId, slideId, '{}')
      .run()

    const now = Date.now()
    const stmts = DEMO_ANNOTATIONS.map((d, i) =>
      db.prepare(`
        INSERT OR IGNORE INTO annotations (id, slide_id, type, label, x, y, confidence, session_metadata_json, created_at)
        VALUES (?, ?, 'point', ?, ?, ?, null, null, ?)
      `).bind(d.id, slideId, d.label, d.x, d.y, now + i)
    )

    await db.batch(stmts)
    return { ok: true, seeded: DEMO_ANNOTATIONS.length }
  })

// ─── deleteAllAnnotations (for a slide) ──────────────────────────────────────
export const deleteAllAnnotationsFn = createServerFn({ method: 'POST' })
  .inputValidator((slideId: unknown) => {
    if (typeof slideId !== 'string') throw new Error('slideId required')
    return slideId
  })
  .handler(async ({ data: slideId }): Promise<{ ok: boolean }> => {
    const db = getDB()
    if (!db) return { ok: false }
    await db.prepare('DELETE FROM annotations WHERE slide_id = ?').bind(slideId).run()
    return { ok: true }
  })
