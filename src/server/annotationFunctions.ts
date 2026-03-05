import { createServerFn } from '@tanstack/react-start'
import { getDB } from './db'
import { LABEL_COLOR_MAP } from '../lib/annotationConfig'
import type { Annotation, AnnotationLabel } from '../store/pathologyStore'

// ─── DB row shape ─────────────────────────────────────────────────────────────
interface AnnotationRow {
  id: string
  slide_id: string
  type: string
  label: string
  x: number
  y: number
  confidence: number | null
  session_metadata_json: string | null
  created_at: number
}

function rowToAnnotation(row: AnnotationRow): Annotation {
  const label = row.label as AnnotationLabel
  return {
    id: row.id,
    type: 'point',
    imageCoords: { x: row.x, y: row.y },
    label,
    color: LABEL_COLOR_MAP[label] ?? '#94a3b8',
    createdAt: row.created_at,
  }
}

// ─── getAnnotations ───────────────────────────────────────────────────────────
export const getAnnotationsFn = createServerFn({ method: 'GET' })
  .inputValidator((slideId: unknown) => {
    if (typeof slideId !== 'string') throw new Error('slideId must be a string')
    return slideId
  })
  .handler(async ({ data: slideId }): Promise<Annotation[]> => {
    const db = await getDB()
    if (!db) return []
    const result = await db
      .prepare('SELECT * FROM annotations WHERE slide_id = ? ORDER BY created_at ASC')
      .bind(slideId)
      .all<AnnotationRow>()
    return (result.results ?? []).map(rowToAnnotation)
  })

// ─── saveAnnotations (bulk upsert) ───────────────────────────────────────────
interface SaveAnnotationsInput {
  slideId: string
  annotations: Annotation[]
  sessionMeta?: { threshold: number; inferenceMs: number } | null
}

export const saveAnnotationsFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as SaveAnnotationsInput
    if (typeof d?.slideId !== 'string') throw new Error('slideId required')
    if (!Array.isArray(d?.annotations)) throw new Error('annotations must be array')
    return d
  })
  .handler(async ({ data }): Promise<{ ok: boolean; saved: number }> => {
    const db = await getDB()
    if (!db) return { ok: false, saved: 0 }
    if (data.annotations.length === 0) return { ok: true, saved: 0 }

    const sessionJson = data.sessionMeta ? JSON.stringify(data.sessionMeta) : null

    // Ensure slide row exists
    await db
      .prepare(`INSERT OR IGNORE INTO slides (id, name, metadata_json) VALUES (?, ?, ?)`)
      .bind(data.slideId, data.slideId, '{}')
      .run()

    // Bulk upsert — D1 batch runs all statements in one transaction
    const stmts = data.annotations.map((ann) =>
      db.prepare(`
        INSERT INTO annotations (id, slide_id, type, label, x, y, confidence, session_metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          label      = excluded.label,
          x          = excluded.x,
          y          = excluded.y,
          confidence = excluded.confidence
      `).bind(
        ann.id,
        data.slideId,
        ann.type,
        ann.label,
        ann.imageCoords.x,
        ann.imageCoords.y,
        null,
        sessionJson,
        ann.createdAt,
      )
    )

    await db.batch(stmts)
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
    const db = await getDB()
    if (!db) return { ok: false }
    await db.prepare('DELETE FROM annotations WHERE id = ?').bind(data.id).run()
    return { ok: true }
  })

// ─── deleteAllAnnotations (for a slide) ──────────────────────────────────────
export const deleteAllAnnotationsFn = createServerFn({ method: 'POST' })
  .inputValidator((slideId: unknown) => {
    if (typeof slideId !== 'string') throw new Error('slideId required')
    return slideId
  })
  .handler(async ({ data: slideId }): Promise<{ ok: boolean }> => {
    const db = await getDB()
    if (!db) return { ok: false }
    await db.prepare('DELETE FROM annotations WHERE slide_id = ?').bind(slideId).run()
    return { ok: true }
  })
