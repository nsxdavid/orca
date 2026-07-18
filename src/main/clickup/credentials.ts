import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { safeStorage } from 'electron'
import {
  CredentialDecryptionError,
  credentialFileHasContent,
  readStoredCredentialToken
} from '../integration-credential-file'
import type { ClickUpViewer, ClickUpWorkspace } from '../../shared/types'

export type ClickUpAccountFile = {
  version: 1
  activeWorkspaceId: string | null
  selectedWorkspaceId: string | null
  viewer: ClickUpViewer | null
  workspaces: ClickUpWorkspace[]
}

let cachedToken: string | null | undefined
let cachedAccount: ClickUpAccountFile | undefined
let credentialError: string | undefined

function getOrcaDir(): string {
  return join(homedir(), '.orca')
}

function getTokenPath(): string {
  return join(getOrcaDir(), 'clickup-token.enc')
}

function getAccountPath(): string {
  return join(getOrcaDir(), 'clickup-account.json')
}

function ensureOrcaDir(): void {
  if (!existsSync(getOrcaDir())) {
    mkdirSync(getOrcaDir(), { recursive: true })
  }
}

export function emptyAccount(): ClickUpAccountFile {
  return {
    version: 1,
    activeWorkspaceId: null,
    selectedWorkspaceId: null,
    viewer: null,
    workspaces: []
  }
}

export function stringValue(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}

export function normalizeWorkspace(value: unknown): ClickUpWorkspace | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const item = value as Record<string, unknown>
  const id = stringValue(item.id)
  const name = stringValue(item.name)
  if (!id || !name) {
    return null
  }
  return {
    id,
    name,
    color: stringValue(item.color) || undefined,
    avatarUrl: stringValue(item.avatar) || undefined
  }
}

export function normalizeViewer(value: unknown): ClickUpViewer | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const item = value as Record<string, unknown>
  const id = stringValue(item.id)
  if (!id) {
    return null
  }
  return {
    id,
    username: stringValue(item.username) || stringValue(item.email) || 'ClickUp user',
    email: stringValue(item.email) || null,
    avatarUrl: stringValue(item.profilePicture) || stringValue(item.color) || undefined
  }
}

function normalizeAccountFile(value: unknown): ClickUpAccountFile {
  if (!value || typeof value !== 'object') {
    return emptyAccount()
  }
  const input = value as Partial<ClickUpAccountFile>
  const workspaces = Array.isArray(input.workspaces)
    ? input.workspaces.map(normalizeWorkspace).filter((item): item is ClickUpWorkspace => !!item)
    : []
  const activeWorkspaceId =
    typeof input.activeWorkspaceId === 'string' &&
    workspaces.some((workspace) => workspace.id === input.activeWorkspaceId)
      ? input.activeWorkspaceId
      : (workspaces[0]?.id ?? null)
  const selectedWorkspaceId =
    typeof input.selectedWorkspaceId === 'string' &&
    workspaces.some((workspace) => workspace.id === input.selectedWorkspaceId)
      ? input.selectedWorkspaceId
      : activeWorkspaceId
  return {
    version: 1,
    activeWorkspaceId,
    selectedWorkspaceId,
    viewer: normalizeViewer(input.viewer),
    workspaces
  }
}

export function readAccountFile(): ClickUpAccountFile {
  if (cachedAccount !== undefined) {
    return cachedAccount
  }
  if (!existsSync(getAccountPath())) {
    cachedAccount = emptyAccount()
    return cachedAccount
  }
  try {
    cachedAccount = normalizeAccountFile(
      JSON.parse(readFileSync(getAccountPath(), { encoding: 'utf-8' }))
    )
    return cachedAccount
  } catch {
    cachedAccount = emptyAccount()
    return cachedAccount
  }
}

export function writeAccountFile(file: ClickUpAccountFile): void {
  ensureOrcaDir()
  cachedAccount = normalizeAccountFile(file)
  writeFileSync(getAccountPath(), JSON.stringify(cachedAccount, null, 2), {
    encoding: 'utf-8',
    mode: 0o600
  })
}

function writeEncryptedToken(apiToken: string): void {
  ensureOrcaDir()
  if (safeStorage.isEncryptionAvailable()) {
    writeFileSync(getTokenPath(), safeStorage.encryptString(apiToken), { mode: 0o600 })
    return
  }
  console.warn('[clickup] safeStorage encryption unavailable - storing token in plaintext')
  writeFileSync(getTokenPath(), apiToken, { encoding: 'utf-8', mode: 0o600 })
}

export function readToken(): string | null {
  if (cachedToken !== undefined) {
    return cachedToken
  }
  if (!existsSync(getTokenPath())) {
    cachedToken = null
    return cachedToken
  }
  try {
    cachedToken = readStoredCredentialToken('ClickUp', readFileSync(getTokenPath()))
    credentialError = undefined
    return cachedToken
  } catch (error) {
    if (error instanceof CredentialDecryptionError) {
      credentialError = error.message
      throw error
    }
    cachedToken = null
    return cachedToken
  }
}

export function saveToken(apiToken: string): void {
  writeEncryptedToken(apiToken)
  cachedToken = apiToken
  credentialError = undefined
}

export function deleteToken(): void {
  cachedToken = null
  credentialError = undefined
  try {
    unlinkSync(getTokenPath())
  } catch {
    // Token may not exist.
  }
}

export function hasStoredToken(): boolean {
  if (cachedToken !== undefined) {
    return cachedToken !== null
  }
  return credentialFileHasContent(getTokenPath())
}

export function getCredentialError(): string | undefined {
  return credentialError
}
