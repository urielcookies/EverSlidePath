import { createServerFn } from '@tanstack/react-start'
import { getDB } from './db'
import { getSession } from './session'
import type { SessionUser } from './session'

// ─── Crypto helpers ───────────────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  const hashArr = new Uint8Array(bits)
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('')
  const hashHex = Array.from(hashArr).map((b) => b.toString(16).padStart(2, '0')).join('')
  return `pbkdf2:${saltHex}:${hashHex}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':')
  if (parts.length !== 3 || parts[0] !== 'pbkdf2') return false
  const salt = new Uint8Array(parts[1].match(/.{2}/g)!.map((b) => parseInt(b, 16)))
  const expectedHash = parts[2].match(/.{2}/g)!.map((b) => parseInt(b, 16))
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  const actualHash = Array.from(new Uint8Array(bits))
  // Constant-time compare via XOR loop
  let diff = 0
  for (let i = 0; i < 32; i++) {
    diff |= actualHash[i] ^ (expectedHash[i] ?? 0)
  }
  return diff === 0
}

function generateId(): string {
  return crypto.randomUUID()
}

function generateToken(): string {
  const arr = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// 30 days in seconds
const SESSION_TTL = 30 * 24 * 60 * 60

// ─── createInstructorFn ───────────────────────────────────────────────────────

interface CreateInstructorInput {
  username: string
  password: string
  display_name: string
}

export const createInstructorFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as CreateInstructorInput
    if (typeof d?.username !== 'string' || d.username.trim().length < 3)
      throw new Error('Username must be at least 3 characters')
    if (typeof d?.password !== 'string' || d.password.length < 8)
      throw new Error('Password must be at least 8 characters')
    if (typeof d?.display_name !== 'string' || d.display_name.trim().length < 1)
      throw new Error('Display name required')
    return d
  })
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const db = getDB()
    if (!db) return { ok: false, error: 'Database unavailable' }

    const existing = await db
      .prepare('SELECT id FROM users WHERE username = ?')
      .bind(data.username.trim().toLowerCase())
      .first<{ id: string }>()
    if (existing) return { ok: false, error: 'Username already taken' }

    const hash = await hashPassword(data.password)
    await db
      .prepare(`INSERT INTO users (id, role, username, display_name, password_hash) VALUES (?, 'instructor', ?, ?, ?)`)
      .bind(generateId(), data.username.trim().toLowerCase(), data.display_name.trim(), hash)
      .run()

    return { ok: true }
  })

// ─── loginInstructorFn ────────────────────────────────────────────────────────

interface LoginInput {
  username: string
  password: string
}

interface AuthResult {
  ok: boolean
  token?: string
  user?: SessionUser
  error?: string
}

export const loginInstructorFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as LoginInput
    if (typeof d?.username !== 'string') throw new Error('username required')
    if (typeof d?.password !== 'string') throw new Error('password required')
    return d
  })
  .handler(async ({ data }): Promise<AuthResult> => {
    const db = getDB()
    if (!db) return { ok: false, error: 'Database unavailable' }

    interface UserRow {
      id: string
      role: 'instructor' | 'student'
      username: string | null
      display_name: string
      password_hash: string | null
      class_code: string | null
    }

    const user = await db
      .prepare(`SELECT id, role, username, display_name, password_hash, class_code FROM users WHERE username = ? AND role = 'instructor'`)
      .bind(data.username.trim().toLowerCase())
      .first<UserRow>()

    if (!user || !user.password_hash) return { ok: false, error: 'Invalid credentials' }

    const valid = await verifyPassword(data.password, user.password_hash)
    if (!valid) return { ok: false, error: 'Invalid credentials' }

    const token = generateToken()
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL
    await db
      .prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(token, user.id, expiresAt)
      .run()

    return {
      ok: true,
      token,
      user: {
        id: user.id,
        role: user.role,
        username: user.username,
        display_name: user.display_name,
        class_code: user.class_code,
      },
    }
  })

// ─── joinAsStudentFn ──────────────────────────────────────────────────────────

interface JoinInput {
  class_code: string
  display_name: string
}

export const joinAsStudentFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as JoinInput
    if (typeof d?.class_code !== 'string' || d.class_code.trim().length < 1)
      throw new Error('class_code required')
    if (typeof d?.display_name !== 'string' || d.display_name.trim().length < 1)
      throw new Error('display_name required')
    return d
  })
  .handler(async ({ data }): Promise<AuthResult> => {
    const db = getDB()
    if (!db) return { ok: false, error: 'Database unavailable' }

    const code = data.class_code.trim().toLowerCase()
    const name = data.display_name.trim()

    // Check class code exists in case_sets (Phase 3) or allow any code for now
    // Upsert: if student with this code+name already exists, return existing session
    interface UserRow {
      id: string
      role: 'instructor' | 'student'
      username: string | null
      display_name: string
      class_code: string | null
    }

    let user = await db
      .prepare(`SELECT id, role, username, display_name, class_code FROM users WHERE class_code = ? AND display_name = ? AND role = 'student'`)
      .bind(code, name)
      .first<UserRow>()

    if (!user) {
      const newId = generateId()
      await db
        .prepare(`INSERT INTO users (id, role, display_name, class_code) VALUES (?, 'student', ?, ?)`)
        .bind(newId, name, code)
        .run()
      user = { id: newId, role: 'student', username: null, display_name: name, class_code: code }
    }

    const token = generateToken()
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL
    await db
      .prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
      .bind(token, user.id, expiresAt)
      .run()

    return {
      ok: true,
      token,
      user: {
        id: user.id,
        role: user.role,
        username: user.username,
        display_name: user.display_name,
        class_code: user.class_code,
      },
    }
  })

// ─── logoutFn ─────────────────────────────────────────────────────────────────

export const logoutFn = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    const d = data as { token: string }
    if (typeof d?.token !== 'string') throw new Error('token required')
    return d
  })
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const db = getDB()
    if (!db) return { ok: false }
    await db.prepare('DELETE FROM sessions WHERE token = ?').bind(data.token).run()
    return { ok: true }
  })

// ─── getMeFn ──────────────────────────────────────────────────────────────────

export const getMeFn = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => data)
  .handler(async (): Promise<SessionUser | null> => {
    return getSession()
  })
