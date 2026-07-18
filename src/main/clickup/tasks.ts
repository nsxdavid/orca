import type {
  ClickUpCreateTaskArgs,
  ClickUpCreateTaskResult,
  ClickUpMutationResult,
  ClickUpTask,
  ClickUpTaskFilter,
  ClickUpTaskType,
  ClickUpTaskUpdate
} from '../../shared/types'
import { createClickUpTaskRecord } from './task-creation'
import { acquire, clearToken, clickUpRequest, getClient, isAuthError, release } from './client'
import { mapClickUpTask } from './mappers'
import { clampTaskLimit, collectTaskList, collectTaskSearchMatches } from './task-list-pages'
import { enrichTaskTypes, listTaskTypes as listTaskTypesForWorkspace } from './task-type-enrichment'
import { buildTaskUpdatePayload } from './task-update-payload'

function connectedClient(workspaceId?: string | null) {
  const client = getClient(workspaceId)
  if (!client) {
    throw new Error('Not connected to ClickUp.')
  }
  return client
}

async function addInitialTaskTags(
  client: ReturnType<typeof connectedClient>,
  taskId: string,
  tagNames: readonly string[] | undefined
): Promise<void> {
  if (!tagNames?.length) {
    return
  }
  const seen = new Set<string>()
  for (const tagName of tagNames) {
    const name = tagName.trim()
    const key = name.toLowerCase()
    if (!name || seen.has(key)) {
      continue
    }
    seen.add(key)
    try {
      await clickUpRequest(
        client,
        `/task/${encodeURIComponent(taskId)}/tag/${encodeURIComponent(name)}`,
        { method: 'POST' }
      )
    } catch (error) {
      if (isAuthError(error)) {
        clearToken()
        throw error
      }
      console.warn('[clickup] initial task tag add failed:', error)
    }
  }
}

export async function listTaskTypes(workspaceId?: string | null): Promise<ClickUpTaskType[]> {
  const client = connectedClient(workspaceId)
  await acquire()
  try {
    return listTaskTypesForWorkspace(client, workspaceId ?? client.workspaceId ?? undefined)
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
      throw error
    }
    throw error
  } finally {
    release()
  }
}

export async function listTasks(
  listId: string,
  filter: ClickUpTaskFilter = 'open',
  limit = 30,
  workspaceId?: string | null
): Promise<ClickUpTask[]> {
  const client = connectedClient(workspaceId)
  const safeLimit = clampTaskLimit(limit)
  const resolvedWorkspaceId = workspaceId ?? client.workspaceId ?? undefined
  await acquire()
  try {
    const tasks = await collectTaskList(client, listId, filter, safeLimit, resolvedWorkspaceId)
    return enrichTaskTypes(client, tasks, resolvedWorkspaceId)
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
      throw error
    }
    throw error
  } finally {
    release()
  }
}

export async function searchTasks(
  listId: string,
  query: string,
  limit = 30,
  workspaceId?: string | null
): Promise<ClickUpTask[]> {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return listTasks(listId, 'open', limit, workspaceId)
  }
  const client = connectedClient(workspaceId)
  const safeLimit = clampTaskLimit(limit)
  const resolvedWorkspaceId = workspaceId ?? client.workspaceId ?? undefined
  await acquire()
  try {
    const matches = await collectTaskSearchMatches(
      client,
      listId,
      needle,
      safeLimit,
      resolvedWorkspaceId
    )
    return enrichTaskTypes(client, matches, resolvedWorkspaceId)
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
      throw error
    }
    throw error
  } finally {
    release()
  }
}

export async function getTask(
  taskId: string,
  listId: string,
  workspaceId?: string | null
): Promise<ClickUpTask | null> {
  const client = connectedClient(workspaceId)
  await acquire()
  try {
    const params = new URLSearchParams({ include_markdown_description: 'true' })
    const task = await clickUpRequest<unknown>(
      client,
      `/task/${encodeURIComponent(taskId)}?${params.toString()}`
    )
    return mapClickUpTask(task, listId, workspaceId ?? client.workspaceId ?? undefined)
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
      throw error
    }
    console.warn('[clickup] getTask failed:', error)
    return null
  } finally {
    release()
  }
}

export async function createTask(
  args: ClickUpCreateTaskArgs,
  workspaceId?: string | null
): Promise<ClickUpCreateTaskResult> {
  const client = connectedClient(workspaceId)
  const name = args.name.trim()
  if (!name) {
    return { ok: false, error: 'Task name is required.' }
  }
  await acquire()
  try {
    const created = await createClickUpTaskRecord(
      client,
      { ...args, name },
      workspaceId ?? undefined
    )
    await addInitialTaskTags(client, created.id, args.tagNames)
    return {
      ok: true,
      id: created.id,
      url: created.url ?? `https://app.clickup.com/t/${created.id}`,
      task: created
    }
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
      throw error
    }
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to create task.' }
  } finally {
    release()
  }
}

export async function updateTask(
  taskId: string,
  updates: ClickUpTaskUpdate,
  workspaceId?: string | null
): Promise<ClickUpMutationResult> {
  const client = connectedClient(workspaceId)
  await acquire()
  try {
    await clickUpRequest(client, `/task/${encodeURIComponent(taskId)}`, {
      method: 'PUT',
      body: JSON.stringify(buildTaskUpdatePayload(updates))
    })
    return { ok: true }
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
      throw error
    }
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to update task.' }
  } finally {
    release()
  }
}
