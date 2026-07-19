import type { ClickUpMutationResult } from '../../shared/types'
import { acquire, clearToken, clickUpRequest, getClient, isAuthError, release } from './client'

function connectedClient(workspaceId?: string | null) {
  const client = getClient(workspaceId)
  if (!client) {
    throw new Error('Not connected to ClickUp.')
  }
  return client
}

async function mutateTaskTag(
  taskId: string,
  tagName: string,
  method: 'DELETE' | 'POST',
  failureMessage: string,
  workspaceId?: string | null
): Promise<ClickUpMutationResult> {
  const client = connectedClient(workspaceId)
  const name = tagName.trim()
  if (!name) {
    return { ok: false, error: 'Tag name is required.' }
  }
  await acquire()
  try {
    await clickUpRequest(
      client,
      `/task/${encodeURIComponent(taskId)}/tag/${encodeURIComponent(name)}`,
      { method }
    )
    return { ok: true }
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
      throw error
    }
    return { ok: false, error: error instanceof Error ? error.message : failureMessage }
  } finally {
    release()
  }
}

export function addTaskTag(
  taskId: string,
  tagName: string,
  workspaceId?: string | null
): Promise<ClickUpMutationResult> {
  return mutateTaskTag(taskId, tagName, 'POST', 'Failed to add tag.', workspaceId)
}

export function removeTaskTag(
  taskId: string,
  tagName: string,
  workspaceId?: string | null
): Promise<ClickUpMutationResult> {
  return mutateTaskTag(taskId, tagName, 'DELETE', 'Failed to remove tag.', workspaceId)
}
