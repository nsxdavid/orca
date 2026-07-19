import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import type * as Os from 'node:os'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  netFetch: vi.fn(),
  resolveProxy: vi.fn(async () => 'DIRECT')
}))

let tempHome = ''

function writeClickUpCredential(
  token: string,
  selectedWorkspaceId: string,
  workspaceIds: string[]
): void {
  const orcaDir = join(tempHome, '.orca')
  mkdirSync(orcaDir, { recursive: true })
  writeFileSync(join(orcaDir, 'clickup-token.enc'), token, { encoding: 'utf-8' })
  writeFileSync(
    join(orcaDir, 'clickup-account.json'),
    JSON.stringify({
      version: 1,
      activeWorkspaceId: selectedWorkspaceId,
      selectedWorkspaceId,
      viewer: { id: 'old-user', username: 'Old user', email: null },
      workspaces: workspaceIds.map((id) => ({ id, name: id }))
    }),
    { encoding: 'utf-8' }
  )
}

function successResponse(workspaceIds: string[]): Response {
  return new Response(
    JSON.stringify({
      user: { id: 42, username: 'New user', email: 'new@example.test' },
      teams: workspaceIds.map((id) => ({ id, name: id }))
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}

async function loadClient() {
  vi.resetModules()
  vi.doMock('electron', () => ({
    net: { fetch: mocks.netFetch },
    safeStorage: {
      isEncryptionAvailable: () => false,
      encryptString: (value: string) => Buffer.from(value),
      decryptString: (value: Buffer) => value.toString('utf-8')
    },
    session: { defaultSession: { resolveProxy: mocks.resolveProxy } }
  }))
  vi.doMock('os', async () => {
    const actual = await vi.importActual<typeof Os>('os')
    return { ...actual, homedir: () => tempHome }
  })
  vi.doMock('../network/proxy-settings', () => ({
    ensureElectronProxyFromEnvironment: vi.fn(async () => {})
  }))
  vi.doMock('../observability/tracer', () => ({
    withSpan: async (
      _name: string,
      callback: (span: {
        setAttribute: (name: string, value: unknown) => void
        addEvent: (name: string, attributes?: Record<string, unknown>) => void
      }) => Promise<unknown>
    ) =>
      callback({
        setAttribute: () => {},
        addEvent: () => {}
      })
  }))
  return import('./client')
}

describe('ClickUp credential replacement', () => {
  beforeEach(() => {
    tempHome = mkdtempSync(join(tmpdir(), 'orca-clickup-client-'))
    mocks.netFetch.mockReset()
    mocks.resolveProxy.mockClear()
  })

  afterEach(() => {
    rmSync(tempHome, { recursive: true, force: true })
    vi.doUnmock('electron')
    vi.doUnmock('os')
    vi.doUnmock('../network/proxy-settings')
    vi.doUnmock('../observability/tracer')
  })

  it('keeps the selected workspace when the replacement token can access it', async () => {
    writeClickUpCredential('old-token', 'workspace-two', ['workspace-one', 'workspace-two'])
    mocks.netFetch.mockResolvedValue(successResponse(['workspace-one', 'workspace-two']))
    const clickUp = await loadClient()

    await expect(clickUp.connect({ apiToken: 'replacement-token' })).resolves.toMatchObject({
      ok: true
    })

    expect(clickUp.getStatus()).toMatchObject({
      selectedWorkspaceId: 'workspace-two',
      activeWorkspaceId: 'workspace-two'
    })
    expect(readFileSync(join(tempHome, '.orca', 'clickup-token.enc'), 'utf-8')).toBe(
      'replacement-token'
    )
  })

  it('keeps the current credential when replacement verification fails', async () => {
    writeClickUpCredential('old-token', 'workspace-one', ['workspace-one'])
    mocks.netFetch.mockResolvedValue(
      new Response(JSON.stringify({ err: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    )
    const clickUp = await loadClient()

    await expect(clickUp.connect({ apiToken: 'invalid-token' })).resolves.toEqual({
      ok: false,
      error: 'Invalid token'
    })

    expect(readFileSync(join(tempHome, '.orca', 'clickup-token.enc'), 'utf-8')).toBe('old-token')
    expect(clickUp.getStatus()).toMatchObject({
      connected: true,
      selectedWorkspaceId: 'workspace-one'
    })
  })
})
