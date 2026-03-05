import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import { runWithEnv } from './server/workerEnv'
import type { WorkerBindings } from './server/workerEnv'

const startFetch = createStartHandler(defaultStreamHandler)

// Required by TanStack Start internals
function createServerEntry(entry: { fetch(...args: any[]): Promise<Response> }) {
  return {
    async fetch(...args: any[]) {
      return await entry.fetch(...args)
    },
  }
}

export { createServerEntry }

export default {
  async fetch(request: Request, env: WorkerBindings, _ctx: any): Promise<Response> {
    const url = new URL(request.url)

    // Proxy R2 objects at /api/r2/<key>
    if (url.pathname.startsWith('/api/r2/')) {
      const key = decodeURIComponent(url.pathname.slice('/api/r2/'.length))
      const obj = await env.BUCKET.get(key)
      if (!obj) return new Response('Not Found', { status: 404 })
      const headers = new Headers()
      if (obj.httpMetadata?.contentType) {
        headers.set('Content-Type', obj.httpMetadata.contentType)
      }
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      return new Response(obj.body, { headers })
    }

    // Capture the Worker env in AsyncLocalStorage so server functions can access
    // bindings (DB, BUCKET) without relying on the non-existent cloudflare:env module.
    return runWithEnv(env, () => startFetch(request))
  },
}
