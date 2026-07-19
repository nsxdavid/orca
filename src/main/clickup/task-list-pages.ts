import type { ClickUpTask, ClickUpTaskFilter, ClickUpTaskPage } from '../../shared/types'
import type { ClickUpClient } from './client'
import { clickUpRequest } from './client'
import {
  clickUpTaskMatchesFilter,
  CLICKUP_API_PAGE_SIZE,
  mapClickUpTaskPageResponse,
  type ClickUpTasksResponse
} from './task-page-response'

export function clampTaskLimit(limit: number | undefined, fallback = 30): number {
  const value = Number.isFinite(limit) ? Number(limit) : fallback
  return Math.max(1, value)
}

function filterToClosedFlag(filter: ClickUpTaskFilter | undefined): string | null {
  if (filter === 'closed') {
    return 'true'
  }
  if (filter === 'all') {
    return 'true'
  }
  return null
}

export async function fetchTaskListPage(
  client: ClickUpClient,
  listId: string,
  filter: ClickUpTaskFilter,
  page: number,
  workspaceId: string | undefined,
  includeSubtasks = true
): Promise<ClickUpTaskPage> {
  const params = new URLSearchParams({
    archived: 'false',
    include_timl: 'true',
    page: String(page),
    order_by: 'updated',
    reverse: 'true',
    subtasks: String(includeSubtasks)
  })
  const includeClosed = filterToClosedFlag(filter)
  if (includeClosed) {
    params.set('include_closed', includeClosed)
  }
  const response = await clickUpRequest<ClickUpTasksResponse>(
    client,
    `/list/${encodeURIComponent(listId)}/task?${params.toString()}`
  )
  // ClickUp can include nested rows even when the request is root-only; keep data it already sent.
  return mapClickUpTaskPageResponse({ response, listId, workspaceId, page, filter })
}

export async function fetchTaskChildrenPage(
  client: ClickUpClient,
  parentTaskId: string,
  listId: string,
  filter: ClickUpTaskFilter,
  page: number,
  workspaceId: string | undefined
): Promise<ClickUpTaskPage> {
  if (!workspaceId) {
    throw new Error('A ClickUp workspace is required to load subtasks.')
  }
  if (page > 0) {
    return { tasks: [], discoveredTasks: [], completeParentIds: [], page, hasMore: false }
  }

  // Why: workspace-wide `subtasks=true` reads can time out for large trees; one task read
  // returns the requested branch without scanning the rest of the Workspace.
  const response = await clickUpRequest<Record<string, unknown>>(
    client,
    `/task/${encodeURIComponent(parentTaskId)}?include_subtasks=true`
  )
  const mapped = mapClickUpTaskPageResponse({
    response: { tasks: [response], last_page: true },
    listId,
    workspaceId,
    page,
    filter
  })
  const discoveredTasks = mapped.tasks.filter((task) => task.id !== parentTaskId)
  const tasks = discoveredTasks.filter((task) => task.parentId === parentTaskId)
  return {
    tasks,
    discoveredTasks,
    completeParentIds: mapped.completeParentIds,
    page,
    hasMore: false
  }
}

export async function collectTaskList(
  client: ClickUpClient,
  listId: string,
  filter: ClickUpTaskFilter,
  limit: number,
  workspaceId: string | undefined
): Promise<ClickUpTask[]> {
  const tasks: ClickUpTask[] = []
  const seen = new Set<string>()
  const maxPages = Math.ceil(limit / CLICKUP_API_PAGE_SIZE) + 1
  for (let page = 0; page < maxPages && tasks.length < limit; page += 1) {
    const result = await fetchTaskListPage(client, listId, filter, page, workspaceId)
    for (const task of result.tasks) {
      if (seen.has(task.id) || !clickUpTaskMatchesFilter(task, filter)) {
        continue
      }
      seen.add(task.id)
      tasks.push(task)
      if (tasks.length >= limit) {
        break
      }
    }
    if (!result.hasMore) {
      break
    }
  }
  return tasks.slice(0, limit)
}

function taskMatchesSearch(task: ClickUpTask, needle: string): boolean {
  const haystack = [
    task.id,
    task.customId ?? '',
    task.title,
    task.description ?? '',
    task.markdownDescription ?? '',
    task.customItemName ?? '',
    task.status?.status ?? '',
    task.priority?.priority ?? '',
    ...task.tags.map((tag) => tag.name)
  ]
    .join('\n')
    .toLowerCase()
  return haystack.includes(needle)
}

export async function collectTaskSearchMatches(
  client: ClickUpClient,
  listId: string,
  needle: string,
  limit: number,
  workspaceId: string | undefined
): Promise<ClickUpTask[]> {
  const matches: ClickUpTask[] = []
  const seen = new Set<string>()
  for (let page = 0; matches.length < limit; page += 1) {
    const result = await fetchTaskListPage(client, listId, 'all', page, workspaceId)
    for (const task of result.tasks) {
      if (seen.has(task.id) || !taskMatchesSearch(task, needle)) {
        continue
      }
      seen.add(task.id)
      matches.push(task)
      if (matches.length >= limit) {
        break
      }
    }
    if (!result.hasMore) {
      break
    }
  }
  return matches.slice(0, limit)
}
