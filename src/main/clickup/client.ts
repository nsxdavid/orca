import { net, session } from 'electron'
import { ensureElectronProxyFromEnvironment } from '../network/proxy-settings'
import { withSpan } from '../observability/tracer'
import type {
  ClickUpConnectArgs,
  ClickUpConnectionStatus,
  ClickUpViewer,
  ClickUpWorkspace
} from '../../shared/types'
import {
  deleteToken,
  emptyAccount,
  getCredentialError,
  hasStoredToken,
  normalizeViewer,
  normalizeWorkspace,
  readAccountFile,
  readToken,
  saveToken,
  writeAccountFile
} from './credentials'
import { runClickUpRequest } from './request-scheduler'

const CLICKUP_API_BASE_URL = 'https://api.clickup.com/api/v2'
const MAX_CONCURRENT = 4

let running = 0
const queue: (() => void)[] = []
// Visible task rows should not wait behind background metadata before their tree controls resolve.
const interactiveQueue: (() => void)[] = []
let proxySetup: Promise<void> | null = null

export type ClickUpClient = {
  token: string
  workspaceId?: string | null
}

export class ClickUpApiError extends Error {
  status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.status = status
  }
}

export function acquire(priority: 'normal' | 'interactive' = 'normal'): Promise<void> {
  if (running < MAX_CONCURRENT) {
    running += 1
    return Promise.resolve()
  }
  return new Promise((resolve) =>
    (priority === 'interactive' ? interactiveQueue : queue).push(() => {
      running += 1
      resolve()
    })
  )
}

export function release(): void {
  running -= 1
  const next = interactiveQueue.shift() ?? queue.shift()
  if (next) {
    next()
  }
}

function describeTransportCause(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('cause' in error)) {
    return undefined
  }
  const cause = (error as { cause?: unknown }).cause
  return cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause)
}

async function ensureClickUpProxy(url: string): Promise<void> {
  if (!proxySetup) {
    // The default session persists for the process, so repeat requests only need route resolution.
    proxySetup = ensureElectronProxyFromEnvironment({
      proxySession: session.defaultSession,
      probeUrl: url
    })
      .then(() => undefined)
      .catch((error) => {
        proxySetup = null
        throw error
      })
  }
  return proxySetup
}

async function clickUpFetch(url: string, init: RequestInit): Promise<Response> {
  return withSpan(
    'clickup.request',
    async (span) => {
      span.setAttribute('clickup.host', new URL(url).origin)
      let resolvedProxy = 'unknown'
      await ensureClickUpProxy(url).catch((error) => {
        span.addEvent('clickup.proxySetupFailed', {
          errorName: error instanceof Error ? error.name : typeof error,
          errorMessage: error instanceof Error ? error.message : String(error)
        })
      })
      await session.defaultSession
        .resolveProxy(url)
        .then((value) => {
          resolvedProxy = value
          span.setAttribute('clickup.resolvedProxy', value)
        })
        .catch((error) => {
          resolvedProxy = `resolve failed: ${error instanceof Error ? error.message : String(error)}`
          span.setAttribute('clickup.resolvedProxy', resolvedProxy)
        })
      const controller = new AbortController()
      const abortFromCaller = (): void => controller.abort(init.signal?.reason)
      if (init.signal?.aborted) {
        abortFromCaller()
      } else {
        init.signal?.addEventListener('abort', abortFromCaller, { once: true })
      }
      const timeout = setTimeout(
        () => controller.abort(new Error('ClickUp request timed out after 30 seconds.')),
        30_000
      )
      try {
        return await net.fetch(url, { ...init, signal: controller.signal })
      } catch (error) {
        span.setAttribute(
          'clickup.transportErrorName',
          error instanceof Error ? error.name : typeof error
        )
        span.setAttribute(
          'clickup.transportErrorMessage',
          error instanceof Error ? error.message : String(error)
        )
        const cause = describeTransportCause(error)
        if (cause) {
          span.setAttribute('clickup.transportErrorCause', cause)
        }
        const message = error instanceof Error ? error.message : String(error)
        throw new Error(`${message} (Electron proxy route: ${resolvedProxy})`)
      } finally {
        clearTimeout(timeout)
        init.signal?.removeEventListener('abort', abortFromCaller)
      }
    },
    { kind: 'client' }
  )
}

async function readClickUpError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { err?: string; ECODE?: string; message?: string }
    return (
      data.err ||
      data.message ||
      response.statusText ||
      `ClickUp request failed (${response.status})`
    )
  } catch {
    return response.statusText || `ClickUp request failed (${response.status})`
  }
}

export async function clickUpRequest<T>(
  client: ClickUpClient,
  path: string,
  init?: RequestInit
): Promise<T> {
  const headers = new Headers(init?.headers)
  headers.set('Accept', 'application/json')
  headers.set('Content-Type', 'application/json')
  headers.set('Authorization', client.token)
  const requestInit = { ...init, headers }
  const response = await runClickUpRequest(client.token, requestInit.method ?? 'GET', () =>
    clickUpFetch(`${CLICKUP_API_BASE_URL}${path}`, requestInit)
  )
  if (!response.ok) {
    throw new ClickUpApiError(await readClickUpError(response), response.status)
  }
  if (response.status === 204) {
    return null as T
  }
  return (await response.json()) as T
}

export function getClient(workspaceId?: string | null): ClickUpClient | null {
  const token = readToken()
  if (!token) {
    return null
  }
  return { token, workspaceId: workspaceId ?? readAccountFile().selectedWorkspaceId }
}

export function getStatus(): ClickUpConnectionStatus {
  const account = readAccountFile()
  const connected = hasStoredToken()
  return {
    connected,
    viewer: connected ? account.viewer : null,
    workspaces: connected ? account.workspaces : [],
    activeWorkspaceId: connected ? account.activeWorkspaceId : null,
    selectedWorkspaceId: connected ? account.selectedWorkspaceId : null,
    ...(getCredentialError() ? { credentialError: getCredentialError() } : {})
  }
}

export async function connect(
  args: ClickUpConnectArgs
): Promise<{ ok: true; viewer: ClickUpViewer } | { ok: false; error: string }> {
  const apiToken = args.apiToken.trim()
  if (!apiToken) {
    return { ok: false, error: 'API token is required.' }
  }
  await acquire()
  try {
    const client = { token: apiToken }
    const response = await clickUpRequest<{ teams?: unknown[]; user?: unknown }>(client, '/team')
    const workspaces = (response.teams ?? [])
      .map(normalizeWorkspace)
      .filter((workspace): workspace is ClickUpWorkspace => !!workspace)
    const viewer = normalizeViewer(response.user) ?? {
      id: 'clickup-user',
      username: 'ClickUp user',
      email: null
    }
    const previousAccount = readAccountFile()
    const includesWorkspace = (workspaceId: string | null): workspaceId is string =>
      workspaceId !== null && workspaces.some((workspace) => workspace.id === workspaceId)
    // Why: rotating a token should not move the task browser when its workspace remains available.
    const activeWorkspaceId = includesWorkspace(previousAccount.activeWorkspaceId)
      ? previousAccount.activeWorkspaceId
      : (workspaces[0]?.id ?? null)
    const selectedWorkspaceId = includesWorkspace(previousAccount.selectedWorkspaceId)
      ? previousAccount.selectedWorkspaceId
      : activeWorkspaceId
    saveToken(apiToken)
    writeAccountFile({
      version: 1,
      activeWorkspaceId,
      selectedWorkspaceId,
      viewer,
      workspaces
    })
    return { ok: true, viewer }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Connection failed.' }
  } finally {
    release()
  }
}

export function disconnect(): void {
  deleteToken()
  writeAccountFile(emptyAccount())
}

export function selectWorkspace(workspaceId: string): ClickUpConnectionStatus {
  const account = readAccountFile()
  if (!account.workspaces.some((workspace) => workspace.id === workspaceId)) {
    return getStatus()
  }
  writeAccountFile({
    ...account,
    activeWorkspaceId: workspaceId,
    selectedWorkspaceId: workspaceId
  })
  return getStatus()
}

export async function testConnection(): Promise<
  { ok: true; viewer: ClickUpViewer } | { ok: false; error: string }
> {
  const client = getClient()
  if (!client) {
    return { ok: false, error: 'Not connected to ClickUp.' }
  }
  await acquire()
  try {
    const response = await clickUpRequest<{ user?: unknown }>(client, '/team')
    return {
      ok: true,
      viewer: normalizeViewer(response.user) ??
        readAccountFile().viewer ?? {
          id: 'clickup-user',
          username: 'ClickUp user',
          email: null
        }
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Connection failed.' }
  } finally {
    release()
  }
}

export function clearToken(): void {
  disconnect()
}

export function isAuthError(error: unknown): boolean {
  // A 403 can be a valid token without access to one resource; only invalid credentials disconnect.
  return error instanceof ClickUpApiError && error.status === 401
}
