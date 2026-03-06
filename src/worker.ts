import { createStartHandler, defaultStreamHandler } from '@tanstack/react-start/server'
import { runWithEnv } from './server/workerEnv'
import type { WorkerBindings } from './server/workerEnv'
import { runWithSession } from './server/session'
import type { SessionUser } from './server/session'

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

    // Resolve session from Bearer token if present
    let sessionUser: SessionUser | null = null
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (token && env.DB) {
      interface SessionRow {
        id: string
        role: 'instructor' | 'student'
        username: string | null
        display_name: string
        class_code: string | null
      }
      const row = await (env.DB as any)
        .prepare(`
          SELECT u.id, u.role, u.username, u.display_name, u.class_code
          FROM sessions s
          JOIN users u ON u.id = s.user_id
          WHERE s.token = ? AND s.expires_at > unixepoch()
        `)
        .bind(token)
        .first<SessionRow>()
      if (row) {
        sessionUser = {
          id: row.id,
          role: row.role,
          username: row.username,
          display_name: row.display_name,
          class_code: row.class_code,
        }
      }
    }

    // Capture the Worker env in AsyncLocalStorage so server functions can access
    // bindings (DB, BUCKET) without relying on the non-existent cloudflare:env module.
    return runWithEnv(env, () => runWithSession(sessionUser, () => startFetch(request)))
  },
}
