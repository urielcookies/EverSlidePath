/**
 * Type declarations for the `cloudflare:env` virtual module
 * provided by @cloudflare/vite-plugin v1.x.
 *
 * Add bindings here as you define them in wrangler.toml.
 */
declare module 'cloudflare:env' {
  const DB: import('./server/db').D1Database
  export = { DB }
}
