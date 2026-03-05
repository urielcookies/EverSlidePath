import { createServerFn } from '@tanstack/react-start'
import { getDB } from './db'
import { getWorkerEnv } from './workerEnv'

export interface SlideMetadata {
  id: string
  name: string
  scanDate: string
  objectiveLens: string
  micronsPerPixel: number
  dimensions: { width: number; height: number }
  stainProtocol: string
  tissueType: string
  scanner: string
  fileSize: string
  tilesUrl: string | { type: string; url: string }
}

const MOCK_SLIDES: Record<string, SlideMetadata> = {
  'slide-001': {
    id: 'slide-001',
    name: 'BRCA-2024-0042-A',
    scanDate: '2024-11-14',
    objectiveLens: '40x',
    micronsPerPixel: 0.2499,
    dimensions: { width: 600, height: 452 },
    stainProtocol: 'H&E',
    tissueType: 'Breast Invasive Carcinoma',
    scanner: 'Aperio GT 450',
    fileSize: '98 KB',
    tilesUrl: { type: 'image', url: '/test-slide/brca.jpg' },
  },
  'slide-002': {
    id: 'slide-002',
    name: 'LUNG-2024-0118-B',
    scanDate: '2024-11-20',
    objectiveLens: '20x',
    micronsPerPixel: 0.4998,
    dimensions: { width: 702, height: 705 },
    stainProtocol: 'H&E',
    tissueType: 'Lung Adenocarcinoma',
    scanner: 'Leica Aperio CS2',
    fileSize: '1.1 MB',
    tilesUrl: { type: 'image', url: '/test-slide/lung.png' },
  },
  'slide-003': {
    id: 'slide-003',
    name: 'COLON-2024-0207-C',
    scanDate: '2024-12-01',
    objectiveLens: '40x',
    micronsPerPixel: 0.2499,
    dimensions: { width: 4272, height: 2848 },
    stainProtocol: 'H&E',
    tissueType: 'Colorectal Adenocarcinoma',
    scanner: 'Hamamatsu NanoZoomer S360',
    fileSize: '2.4 MB',
    tilesUrl: { type: 'image', url: '/test-slide/colon.jpg' },
  },
}

// Raw function — called directly in loaders (no HTTP round-trip)
export function getSlideMetadata(id: string): SlideMetadata {
  return MOCK_SLIDES[id] ?? MOCK_SLIDES['slide-001']
}

// Server function — for client-side RPC calls using correct v1.x API
export const fetchSlideMetadata = createServerFn({ method: 'GET' })
  .inputValidator((id: unknown) => {
    if (typeof id !== 'string') throw new Error('Slide ID must be a string')
    return id
  })
  .handler(async ({ data: id }) => getSlideMetadata(id))

// Returns all uploaded/linked slides stored in D1
export const fetchUploadedSlidesFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<SlideMetadata[]> => {
    const db = getDB()
    if (!db) return []
    const result = await db
      .prepare(`SELECT id, name, metadata_json FROM slides ORDER BY created_at DESC`)
      .all<{ id: string; name: string; metadata_json: string }>()
    return (result.results ?? []).map((row) => {
      let tilesUrl: string | { type: string; url: string }
      try {
        const meta = JSON.parse(row.metadata_json)
        if (meta.url) {
          // URL-linked slide — use URL directly (DZI string or image object)
          tilesUrl = meta.url.endsWith('.dzi')
            ? meta.url
            : { type: 'image', url: meta.url }
        } else {
          // R2-stored slide
          const r2Key = meta.r2Key ?? row.id
          tilesUrl = { type: 'image', url: `/api/r2/${encodeURIComponent(r2Key)}` }
        }
      } catch {
        tilesUrl = { type: 'image', url: `/api/r2/${encodeURIComponent(row.id)}` }
      }
      return {
        id: row.id,
        name: row.name,
        scanDate: new Date().toISOString().slice(0, 10),
        objectiveLens: '—',
        micronsPerPixel: 0,
        dimensions: { width: 1000, height: 1000 },
        stainProtocol: 'Linked',
        tissueType: '—',
        scanner: '—',
        fileSize: '—',
        tilesUrl,
      } satisfies SlideMetadata
    })
  })

// Saves a URL-linked slide to D1 so it persists across sessions
export const addLinkedSlideFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as { name: string; url: string }
    if (typeof d?.name !== 'string' || !d.name.trim()) throw new Error('name required')
    if (typeof d?.url !== 'string' || !d.url.trim()) throw new Error('url required')
    return d
  })
  .handler(async ({ data }): Promise<{ id: string }> => {
    const db = getDB()
    if (!db) throw new Error('DB unavailable')
    const id = crypto.randomUUID()
    const metaJson = JSON.stringify({ url: data.url })
    await db
      .prepare(`INSERT INTO slides (id, name, metadata_json) VALUES (?, ?, ?)`)
      .bind(id, data.name.trim(), metaJson)
      .run()
    return { id }
  })

// Deletes an uploaded or linked slide from D1 and R2 (if applicable)
export const deleteUploadedSlideFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as { id: string }
    if (typeof d?.id !== 'string') throw new Error('id required')
    return d
  })
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = getDB()
    if (!db) return { ok: false }

    const row = await db
      .prepare('SELECT metadata_json FROM slides WHERE id = ?')
      .bind(data.id)
      .first<{ metadata_json: string }>()

    // Only delete from R2 if this is an uploaded (not URL-linked) slide
    if (row?.metadata_json) {
      try {
        const meta = JSON.parse(row.metadata_json)
        if (meta.r2Key && !meta.url) {
          const env = getWorkerEnv()
          if (env?.BUCKET) await env.BUCKET.delete(meta.r2Key)
        }
      } catch { /* ignore */ }
    }

    await db.prepare('DELETE FROM slides WHERE id = ?').bind(data.id).run()
    return { ok: true }
  })
