import { createServerFn } from '@tanstack/react-start'

interface R2Bucket {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<void>
}

interface CloudflareEnv {
  ASSETS: R2Bucket
}

async function getAssets(): Promise<R2Bucket | null> {
  try {
    const mod = await import('cloudflare:env')
    const env = ((mod as any).default ?? mod) as CloudflareEnv
    if (!env?.ASSETS) {
      console.error('[upload] R2 binding "ASSETS" not found in cloudflare:env')
    }
    return env?.ASSETS ?? null
  } catch (err) {
    console.error('[upload] cloudflare:env import failed:', String(err))
    return null
  }
}

interface UploadSlideInput {
  key: string
  data: string // base64-encoded file content
  contentType: string
}

export const uploadSlideFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as UploadSlideInput
    if (typeof d?.key !== 'string' || d.key.trim() === '') throw new Error('key required')
    if (typeof d?.data !== 'string' || d.data === '') throw new Error('data required')
    if (typeof d?.contentType !== 'string') throw new Error('contentType required')
    return d
  })
  .handler(async ({ data }): Promise<{ ok: boolean; key: string; error?: string }> => {
    const assets = await getAssets()
    if (!assets) return { ok: false, key: data.key, error: 'R2 binding unavailable' }

    const binary = atob(data.data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }

    await assets.put(data.key, bytes.buffer, {
      httpMetadata: { contentType: data.contentType },
    })

    return { ok: true, key: data.key }
  })
