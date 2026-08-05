/**
 * supabase.ts — Camada de compatibilidade com o cliente Supabase.
 *
 * Substitui @supabase/supabase-js por chamadas fetch ao backend próprio
 * (Fastify + Postgres na Oracle VM), mantendo a MESMA API fluente usada no app:
 *
 *   supabase.from('tabela').select().eq().in().order().range().single()
 *   supabase.auth.getSession() / getUser() / signInWithPassword() / signUp()
 *   supabase.auth.signOut() / onAuthStateChange()
 *   supabase.storage.from('bucket').upload() / download() / remove()
 *   supabase.storage.from('bucket').list() / getPublicUrl()
 *   supabase.rpc('fn', args)  →  POST /rpc/:fn
 *   supabase.channel('name').on(...).subscribe()  →  polling (sem websocket)
 *
 * Sessão é persistida em localStorage sob a chave "monitorpro_session"
 * (a extensão do navegador lê essa mesma chave).
 */
import { logger } from '../utils/logger';

export interface AuthUser {
  id: string
  email: string
  name: string | null
  approved: boolean
  is_admin: boolean
  created_at?: string
}

export interface AuthSession {
  access_token: string
  user: AuthUser
}

const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || '/api'
export const SUPABASE_URL = API_BASE_URL
export const SUPABASE_ANON_KEY = ''

const SESSION_KEY = 'monitorpro_session'

export function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    return session?.access_token ?? null
  } catch {
    return null
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    return session?.user ?? null
  } catch {
    return null
  }
}

export function setStoredSession(session: AuthSession | null): void {
  if (!session) {
    localStorage.removeItem(SESSION_KEY)
    return
  }
  const payload = { access_token: session.access_token, user: session.user }
  localStorage.setItem(SESSION_KEY, JSON.stringify(payload))
}

// ─── Listener de mudanças de auth (imitando onAuthStateChange) ────────────────

type AuthListener = (event: string, session: AuthSession | null) => void
const authListeners = new Set<AuthListener>()

function emitAuthChange(event: string, session: AuthSession | null): void {
  for (const cb of authListeners) cb(event, session)
}

// ─── Requisição base ───────────────────────────────────────────────────────────

interface ApiRequestOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch(path: string, options: ApiRequestOptions = {}): Promise<Response> {
  const { method = 'GET', body, signal } = options
  const headers: Record<string, string> = {}
  const token = getStoredToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    signal,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    let message = `Erro ${response.status}`
    try {
      const json = await response.json()
      if (json?.message) message = json.message
    } catch {
      /* corpo não-JSON */
    }
    const err = new ApiError(message, response.status)
    if (response.status === 401) {
      setStoredSession(null)
      emitAuthChange('SIGNED_OUT', null)
    }
    throw err
  }

  return response
}

export async function apiJson<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const response = await apiFetch(path, options)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

// ─── Query Builder compatível com supabase.from().select()... ─────────────────

type FilterEntry = { column: string; encoded: string }
type OrderEntry = { column: string; dir: 'asc' | 'desc' }

interface BuildResult {
  query: string
  body?: unknown
  method?: string
  wantCount: boolean
  unwrapSingle: boolean
}

class PostgrestBuilder {
  private table: string
  private filters: FilterEntry[] = []
  private orders: OrderEntry[] = []
  private offset: number | null = null
  private limitNum: number | null = null
  private selectCols = '*'
  private wantCount = false
  private unwrapSingle = false
  private head = false
  private signal?: AbortSignal
  private method: string | null = null
  private body: unknown = null
  private upsertConflict: string | null = null

  constructor(table: string) {
    this.table = table
  }

  // ── filtros ──
  eq(col: string, value: unknown): this {
    this.filters.push({ column: col, encoded: `eq.${this.encode(value)}` })
    return this
  }
  neq(col: string, value: unknown): this {
    this.filters.push({ column: col, encoded: `neq.${this.encode(value)}` })
    return this
  }
  in(col: string, values: unknown[]): this {
    this.filters.push({ column: col, encoded: `in.(${values.map(v => this.encode(v)).join(',')})` })
    return this
  }
  gt(col: string, value: unknown): this {
    this.filters.push({ column: col, encoded: `gt.${this.encode(value)}` })
    return this
  }
  gte(col: string, value: unknown): this {
    this.filters.push({ column: col, encoded: `gte.${this.encode(value)}` })
    return this
  }
  lt(col: string, value: unknown): this {
    this.filters.push({ column: col, encoded: `lt.${this.encode(value)}` })
    return this
  }
  lte(col: string, value: unknown): this {
    this.filters.push({ column: col, encoded: `lte.${this.encode(value)}` })
    return this
  }
  like(col: string, value: unknown): this {
    this.filters.push({ column: col, encoded: `like.${this.encode(value)}` })
    return this
  }
  ilike(col: string, value: unknown): this {
    this.filters.push({ column: col, encoded: `ilike.${this.encode(value)}` })
    return this
  }
  is(col: string, value: unknown): this {
    if (value === null) this.filters.push({ column: col, encoded: 'is.null' })
    else this.filters.push({ column: col, encoded: `is.${this.encode(value)}` })
    return this
  }
  not(col: string, operator: string, value: unknown): this {
    if (operator === 'is' && value === null) {
      this.filters.push({ column: col, encoded: 'not.is.null' })
    } else {
      this.filters.push({ column: col, encoded: `not.${operator}.${this.encode(value)}` })
    }
    return this
  }

  // ── ordenação / paginação ──
  order(col: string, opts?: { ascending?: boolean }): this {
    this.orders.push({ column: col, dir: opts?.ascending === false ? 'desc' : 'asc' })
    return this
  }
  range(from: number, to: number): this {
    this.offset = from
    this.limitNum = to - from + 1
    return this
  }
  limit(n: number): this {
    this.limitNum = n
    return this
  }

  // ── seleção ──
  select(cols?: string, opts?: { count?: 'exact'; head?: boolean }): this {
    this.selectCols = cols && cols.trim() ? cols.trim() : '*'
    if (opts?.count === 'exact') this.wantCount = true
    if (opts?.head === true) this.head = true
    return this
  }
  single(): this {
    this.unwrapSingle = true
    return this
  }
  maybeSingle(): this {
    this.unwrapSingle = true
    return this
  }
  abortSignal(signal: AbortSignal): this {
    this.signal = signal
    return this
  }

  // ── escritas ──
  insert(rows: object | object[]): this {
    this.method = 'POST'
    this.body = Array.isArray(rows) ? rows : [rows]
    return this
  }
  update(payload: object): this {
    this.method = 'PATCH'
    this.body = payload
    return this
  }
  delete(): this {
    this.method = 'DELETE'
    return this
  }
  upsert(rows: object | object[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }): this {
    this.method = 'POST'
    this.body = Array.isArray(rows) ? rows : [rows]
    this.upsertConflict = opts?.onConflict ?? 'id'
    return this
  }

  private encode(value: unknown): string {
    if (value === null || value === undefined) return 'null'
    if (typeof value === 'boolean') return String(value)
    return encodeURIComponent(String(value))
  }

  private build(): BuildResult {
    const query = new URLSearchParams()
    if (this.selectCols !== '*') query.set('select', this.selectCols)
    for (const f of this.filters) query.append(f.column, f.encoded)
    if (this.orders.length) {
      query.set(
        'order',
        this.orders.map(o => `${o.column}${o.dir === 'desc' ? '.desc' : ''}`).join(',')
      )
    }
    if (this.offset !== null) query.set('offset', String(this.offset))
    if (this.limitNum !== null) query.set('limit', String(this.limitNum))
    if (this.wantCount) query.set('count', 'true')
    if (this.head) query.set('head', 'true')

    if (this.method === 'POST' && this.upsertConflict) {
      query.set('on_conflict', this.upsertConflict)
    }

    let path = `/rest/v1/${this.table}`
    if (this.method === 'GET' || !this.method) {
      const qs = query.toString()
      if (qs) path += `?${qs}`
    } else if (this.method === 'PATCH' || this.method === 'DELETE') {
      // PATCH/DELETE por filtro (PostgREST)
      const filterParams = this.filters
        .map(f => `${f.column}=${f.encoded}`)
        .join('&')
      if (filterParams) path += `?${filterParams}`
    } else if (this.method === 'POST' && this.upsertConflict) {
      path = `/rest/v1/${this.table}/upsert?${query.toString()}`
    }

    return {
      query: path,
      body: this.body,
      method: this.method ?? 'GET',
      wantCount: this.wantCount,
      unwrapSingle: this.unwrapSingle,
    }
  }

  async then<TResult1 = PostgrestResponse, TResult2 = never>(
    onfulfilled?: ((value: PostgrestResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    try {
      const result = await this.execute()
      return onfulfilled ? onfulfilled(result) : (result as TResult1)
    } catch (err) {
      if (onrejected) return onrejected(err)
      throw err
    }
  }

  catch(onrejected?: (reason: unknown) => unknown): Promise<unknown> {
    return this.then(undefined, onrejected)
  }

  finally(onfinally?: () => void): Promise<unknown> {
    return this.execute().finally(onfinally)
  }

  private async execute(): Promise<PostgrestResponse> {
    const built = this.build()
    const requestOptions: ApiRequestOptions = { method: built.method, signal: this.signal }
    if (built.body != null) requestOptions.body = built.body

    try {
      const response = await apiFetch(built.query, requestOptions)
      let data: unknown
      if (built.method === 'PATCH' || built.method === 'DELETE') {
        try {
          data = await response.json()
        } catch {
          data = null
        }
      } else {
        data = await response.json()
      }

      let count: number | null = null
      if (built.wantCount && data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
        const wrapper = data as { data: unknown; count?: number }
        data = wrapper.data
        count = wrapper.count ?? null
      }

      if (built.unwrapSingle) {
        if (Array.isArray(data)) {
          if (data.length === 0) data = null
          else data = data[0]
        }
      }

      return { data: (data ?? null) as unknown, error: null, count }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro na requisição'
      logger.error('DATA', 'Erro no shim supabase:', message)
      return { data: null, error: { message } as PostgrestError, count: null }
    }
  }
}

interface PostgrestResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  error: PostgrestError | null
  count: number | null
}

interface PostgrestError {
  message: string
  code?: string
  details?: string
  hint?: string
}

function from(table: string): PostgrestBuilder {
  return new PostgrestBuilder(table)
}

// ─── RPC (substitui supabase.rpc) ──────────────────────────────────────────────

async function rpc(fn: string, args: Record<string, unknown> = {}) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await apiJson<any>(`/rpc/${fn}`, { method: 'POST', body: args })
    return { data, error: null }
  } catch (err) {
    return { data: null, error: { message: err instanceof Error ? err.message : 'Erro no RPC' } }
  }
}

// ─── Realtime via polling (backend não tem websocket) ─────────────────────────

const POLL_INTERVAL_MS = 30000

type RealtimeCallback = (payload: RealtimePayload) => void

interface RealtimePayload {
  table?: string
  schema?: string
  eventType?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  old?: any
}

interface PollChannel {
  _timer: ReturnType<typeof setInterval> | null
  _listeners: RealtimeCallback[]
  on(_event: string, _config: unknown, callback: RealtimeCallback): PollChannel
  subscribe(): PollChannel
  unsubscribe(): PollChannel
}

function channel(name: string): PollChannel {
  const listeners: RealtimeCallback[] = []
  const ch: PollChannel = {
    _timer: null,
    _listeners: listeners,
    on(_event, _config, callback) {
      listeners.push(callback)
      return ch
    },
    subscribe() {
      // Dispara um callback inicial e depois faz polling periódico.
      // Sem websocket no backend, é a aproximação mais simples do realtime.
      const fire = () => {
        for (const cb of listeners) cb({ table: undefined, eventType: 'UPDATE' })
      }
      fire()
      ch._timer = setInterval(fire, POLL_INTERVAL_MS)
      if (typeof ch._timer === 'number') {
        // keepalive não se aplica a polling; apenas evita warning de timer
      }
      return ch
    },
    unsubscribe() {
      if (ch._timer) clearInterval(ch._timer)
      ch._timer = null
      return ch
    },
  }
  logger.log('AUTH', `[realtime] Polling iniciado no canal "${name}" (${POLL_INTERVAL_MS / 1000}s)`);
  return ch
}

function removeChannel(ch: unknown): void {
  const poll = ch as PollChannel | null
  if (poll?.unsubscribe) poll.unsubscribe()
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

async function getSession(): Promise<{ data: { session: AuthSession | null }; error: PostgrestError | null }> {
  const token = getStoredToken()
  if (!token) return { data: { session: null }, error: null }
  const user = getStoredUser()
  if (!user) return { data: { session: null }, error: null }
  return { data: { session: { access_token: token, user } }, error: null }
}

async function getUser(): Promise<{ data: { user: AuthUser | null } }> {
  const user = getStoredUser()
  return { data: { user: user ?? null } }
}

async function signInWithPassword(credentials: { email: string; password: string }): Promise<{ data: { session: AuthSession | null }; error: null }> {
  const result = await apiJson<{ token: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: credentials,
  })
  const session: AuthSession = { access_token: result.token, user: result.user }
  setStoredSession(session)
  emitAuthChange('SIGNED_IN', session)
  return { data: { session }, error: null }
}

async function signUp(credentials: { email: string; password: string }): Promise<{ data: { session: AuthSession | null; user: AuthUser | null }; error: PostgrestError | null }> {
  try {
    const result = await apiJson<{ token: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: credentials,
    })
    const session: AuthSession = { access_token: result.token, user: result.user }
    setStoredSession(session)
    emitAuthChange('SIGNED_IN', session)
    return { data: { session, user: result.user }, error: null }
  } catch (err) {
    return {
      data: { session: null, user: null },
      error: { message: err instanceof Error ? err.message : 'Erro no cadastro' },
    }
  }
}

async function signOut(): Promise<{ error: null }> {
  setStoredSession(null)
  emitAuthChange('SIGNED_OUT', null)
  return { error: null }
}

function onAuthStateChange(callback: AuthListener): { data: { subscription: { unsubscribe: () => void } } } {
  const listener: AuthListener = (event, session) => callback(event, session)
  authListeners.add(listener)
  // Emite o estado inicial (semelhante a INITIAL_SESSION)
  getSession().then(({ data }) => {
    if (data.session) listener('INITIAL_SESSION', data.session)
  })
  return {
    data: {
      subscription: {
        unsubscribe: () => authListeners.delete(listener),
      },
    },
  }
}

const auth = { getSession, getUser, signInWithPassword, signUp, signOut, onAuthStateChange }

// ─── Storage ───────────────────────────────────────────────────────────────────

interface StorageFileObject {
  name: string
  id: string
  path: string
  size: number
  type: string
  created_at: string | null
  updated_at: string | null
  last_accessed_at: string | null
}

interface StorageApi {
  from(bucket: string): {
    upload(path: string, file: Blob, opts?: { contentType?: string; upsert?: boolean }): Promise<{ data: { path: string } | null; error: PostgrestError | null }>
    download(path: string): Promise<{ data: Blob | null; error: PostgrestError | null }>
    remove(paths: string[]): Promise<{ data: unknown; error: PostgrestError | null }>
    list(prefix?: string, opts?: { limit?: number; search?: string; sortBy?: { column: string; order: 'asc' | 'desc' } }): Promise<{ data: StorageFileObject[] | null; error: PostgrestError | null }>
    getPublicUrl(path: string): { data: { publicUrl: string } }
  }
}

const storage: StorageApi = {
  from(bucket: string) {
    return {
      async upload(path, file) {
        const form = new FormData()
        form.append('file', file)
        const token = getStoredToken()
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        try {
          const response = await fetch(
            `${API_BASE_URL}/storage/${encodeURIComponent(bucket)}/upload?path=${encodeURIComponent(path)}`,
            { method: 'POST', headers, body: form }
          )
          if (!response.ok) {
            let msg = `Erro ${response.status}`
            try {
              const j = await response.json()
              if (j?.message) msg = j.message
            } catch { /* noop */ }
            return { data: null, error: { message: msg } }
          }
          const json = await response.json()
          return { data: { path: json.path }, error: null }
        } catch (err) {
          return { data: null, error: { message: err instanceof Error ? err.message : 'Erro no upload' } }
        }
      },
      async download(path) {
        const token = getStoredToken()
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        try {
          const response = await fetch(
            `${API_BASE_URL}/storage/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`,
            { headers }
          )
          if (!response.ok) return { data: null, error: { message: `Erro ${response.status}` } }
          const blob = await response.blob()
          return { data: blob, error: null }
        } catch (err) {
          return { data: null, error: { message: err instanceof Error ? err.message : 'Erro no download' } }
        }
      },
      async remove(paths) {
        const token = getStoredToken()
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        let failed = false
        for (const p of paths || []) {
          try {
            await fetch(
              `${API_BASE_URL}/storage/${encodeURIComponent(bucket)}?path=${encodeURIComponent(p)}`,
              { method: 'DELETE', headers }
            )
          } catch {
            failed = true
          }
        }
        return { data: { paths }, error: failed ? { message: 'Falha ao remover' } : null }
      },
      async list(prefix = '', opts = {}) {
        const token = getStoredToken()
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const params = new URLSearchParams()
        if (prefix) params.set('prefix', prefix)
        if (opts.limit) params.set('limit', String(opts.limit))
        if (opts.search) params.set('search', opts.search)
        const qs = params.toString()
        try {
          const response = await fetch(
            `${API_BASE_URL}/storage/${encodeURIComponent(bucket)}/list${qs ? `?${qs}` : ''}`,
            { headers }
          )
          if (!response.ok) {
            let msg = `Erro ${response.status}`
            try {
              const j = await response.json()
              if (j?.message) msg = j.message
            } catch { /* noop */ }
            return { data: null, error: { message: msg } }
          }
          const data = (await response.json()) as StorageFileObject[]
          return { data, error: null }
        } catch (err) {
          return { data: null, error: { message: err instanceof Error ? err.message : 'Erro ao listar' } }
        }
      },
      getPublicUrl(path) {
        return {
          data: {
            publicUrl: `${API_BASE_URL}/storage/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`,
          },
        }
      },
    }
  },
}

// ─── Edge Functions (aprox: chama /functions/:name no backend) ────────────────

const functions = {
  async invoke(name: string): Promise<{ data: unknown; error: PostgrestError | null }> {
    try {
      const data = await apiJson<unknown>(`/functions/${name}`, { method: 'POST' })
      return { data, error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro na função'
      return {
        data: null,
        error: { message, code: 'FUNCTION_NOT_FOUND' },
      }
    }
  },
}

// ─── Export unificado (compatível com o código existente) ─────────────────────

export const supabase = { from, auth, storage, rpc, channel, removeChannel, functions }

// Tipos de sessão para AuthContext (evita importar @supabase/supabase-js)
export type Session = AuthSession
export type User = AuthUser
