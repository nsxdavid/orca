import type {
  ClickUpTaskFilter,
  ClickUpTaskPage,
  ClickUpTaskReadPriority
} from '../../shared/types'
import { acquire, clearToken, getClient, isAuthError, release } from './client'
import { fetchTaskChildrenPage, fetchTaskListPage } from './task-list-pages'

function connectedClient(workspaceId?: string | null) {
  const client = getClient(workspaceId)
  if (!client) {
    throw new Error('Not connected to ClickUp.')
  }
  return client
}

export async function listTaskPage(
  listId: string,
  filter: ClickUpTaskFilter = 'open',
  page = 0,
  workspaceId?: string | null,
  includeSubtasks = false
): Promise<ClickUpTaskPage> {
  const client = connectedClient(workspaceId)
  const safePage = Math.max(0, Math.floor(page))
  const resolvedWorkspaceId = workspaceId ?? client.workspaceId ?? undefined
  await acquire()
  try {
    return fetchTaskListPage(client, listId, filter, safePage, resolvedWorkspaceId, includeSubtasks)
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
    }
    throw error
  } finally {
    release()
  }
}

export async function listTaskSubtasks(
  taskId: string,
  listId: string,
  filter: ClickUpTaskFilter = 'open',
  page = 0,
  workspaceId?: string | null,
  priority: ClickUpTaskReadPriority = 'interactive'
): Promise<ClickUpTaskPage> {
  const client = connectedClient(workspaceId)
  const resolvedWorkspaceId = workspaceId ?? client.workspaceId ?? undefined
  const safePage = Math.max(0, Math.floor(page))
  await acquire(priority === 'interactive' ? 'interactive' : 'normal')
  try {
    return fetchTaskChildrenPage(client, taskId, listId, filter, safePage, resolvedWorkspaceId)
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
    }
    throw error
  } finally {
    release()
  }
}
