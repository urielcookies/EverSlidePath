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
    dimensions: { width: 1000, height: 1000 },
    stainProtocol: 'IF-DAPI-HER2-KI67',
    tissueType: 'Breast Carcinoma',
    scanner: 'Aperio GT 450',
    fileSize: '4.2 GB',
    tilesUrl: { type: 'image', url: '/test-slide/sample.png' },
  },
  'slide-002': {
    id: 'slide-002',
    name: 'LUNG-2024-0118-B',
    scanDate: '2024-11-20',
    objectiveLens: '20x',
    micronsPerPixel: 0.4998,
    dimensions: { width: 1000, height: 1000 },
    stainProtocol: 'H&E',
    tissueType: 'Lung Adenocarcinoma',
    scanner: 'Leica Aperio CS2',
    fileSize: '2.8 GB',
    tilesUrl: { type: 'image', url: '/test-slide/sample.png' },
  },
  'slide-003': {
    id: 'slide-003',
    name: 'COLON-2024-0207-C',
    scanDate: '2024-12-01',
    objectiveLens: '40x',
    micronsPerPixel: 0.2499,
    dimensions: { width: 1000, height: 1000 },
    stainProtocol: 'IHC-CDX2-CK20',
    tissueType: 'Colorectal Adenocarcinoma',
    scanner: 'Hamamatsu NanoZoomer S360',
    fileSize: '5.7 GB',
    tilesUrl: { type: 'image', url: '/test-slide/sample.png' },
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

// Returns all uploaded slides stored in D1
export const fetchUploadedSlidesFn = createServerFn({ method: 'GET' })
  .handler(async (): Promise<SlideMetadata[]> => {
    const db = getDB()
    if (!db) return []
    const result = await db
      .prepare(`SELECT id, name, metadata_json FROM slides ORDER BY created_at DESC`)
      .all<{ id: string; name: string; metadata_json: string }>()
    return (result.results ?? []).map((row) => {
      let r2Key = row.id
      try {
        const meta = JSON.parse(row.metadata_json)
        if (meta.r2Key) r2Key = meta.r2Key
      } catch {}
      return {
        id: row.id,
        name: row.name,
        scanDate: new Date().toISOString().slice(0, 10),
        objectiveLens: '—',
        micronsPerPixel: 0,
        dimensions: { width: 1000, height: 1000 },
        stainProtocol: 'Uploaded',
        tissueType: '—',
        scanner: '—',
        fileSize: '—',
        tilesUrl: { type: 'image', url: `/api/r2/${encodeURIComponent(r2Key)}` },
      } satisfies SlideMetadata
    })
  })

// Deletes an uploaded slide from D1 and R2
export const deleteUploadedSlideFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as { id: string }
    if (typeof d?.id !== 'string') throw new Error('id required')
    return d
  })
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = getDB()
    if (!db) return { ok: false }

    // Get r2Key from stored metadata
    const row = await db
      .prepare('SELECT metadata_json FROM slides WHERE id = ?')
      .bind(data.id)
      .first<{ metadata_json: string }>()

    // Delete from R2
    const env = getWorkerEnv()
    if (env?.BUCKET) {
      try {
        let r2Key = data.id
        if (row?.metadata_json) {
          const meta = JSON.parse(row.metadata_json)
          if (meta.r2Key) r2Key = meta.r2Key
        }
        await env.BUCKET.delete(r2Key)
      } catch { /* ignore R2 errors */ }
    }

    await db.prepare('DELETE FROM slides WHERE id = ?').bind(data.id).run()
    return { ok: true }
  })
