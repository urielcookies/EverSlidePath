import { createServerFn } from '@tanstack/react-start'
import { getDB } from './db'

interface R2Bucket {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<void>
}

interface CloudflareEnv {
  ASSETS: R2Bucket
}

async function getAssets(): Promise<R2Bucket> {
  try {
    const mod = await import('cloudflare:env')
    const env = ((mod as any).default ?? mod) as CloudflareEnv
    if (!env?.ASSETS) throw new Error('R2_BINDING_MISSING')
    return env.ASSETS
  } catch (err) {
    // Re-throw binding errors as-is so the handler surfaces them
    if ((err as Error).message === 'R2_BINDING_MISSING') throw err
    throw new Error('R2_BINDING_MISSING')
  }
}

interface UploadSlideInput {
  key: string
  data: string // base64-encoded file content
  contentType: string
  name: string
}

export const uploadSlideFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as UploadSlideInput
    if (typeof d?.key !== 'string' || d.key.trim() === '') throw new Error('key required')
    if (typeof d?.data !== 'string' || d.data === '') throw new Error('data required')
    if (typeof d?.contentType !== 'string') throw new Error('contentType required')
    if (typeof d?.name !== 'string' || d.name.trim() === '') throw new Error('name required')
    return d
  })
  .handler(async ({ data }): Promise<{ ok: boolean; key: string; error?: string }> => {
    const assets = await getAssets()

    const binary = atob(data.data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    await assets.put(data.key, bytes.buffer, {
      httpMetadata: { contentType: data.contentType },
    })

    // Write slide metadata to D1 so it persists across sessions
    const db = await getDB()
    if (db) {
      const meta = JSON.stringify({ r2Key: data.key, contentType: data.contentType })
      await db
        .prepare(
          `INSERT OR IGNORE INTO slides (id, name, metadata_json, created_at) VALUES (?, ?, ?, ?)`,
        )
        .bind(data.key, data.name, meta, Date.now())
        .run()
    }

    return { ok: true, key: data.key }
  })
