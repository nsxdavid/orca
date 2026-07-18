import type { ClickUpTask, ClickUpTaskFilter, ClickUpTaskPage } from '../../shared/types'
import { asFiniteNumber, asRecord, asString, mapClickUpTask } from './mappers'

export type ClickUpTasksResponse = { tasks?: unknown[]; last_page?: boolean }

export const CLICKUP_API_PAGE_SIZE = 100

export function clickUpTaskMatchesFilter(task: ClickUpTask, filter: ClickUpTaskFilter): boolean {
  const closed = Boolean(task.closedAt || task.status?.type === 'closed')
  if (filter === 'closed') {
    return closed
  }
  return filter === 'all' || !closed
}

function flattenRawTasks(rawTasks: readonly unknown[], parentId?: string): unknown[] {
  const flattened: unknown[] = []
  for (const raw of rawTasks) {
    const task = asRecord(raw)
    const id = asString(task.id)
    const normalized =
      parentId && task.parent === undefined && task.parent_id === undefined
        ? { ...task, parent: parentId }
        : raw
    flattened.push(normalized)
    const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []
    if (subtasks.length > 0) {
      flattened.push(...flattenRawTasks(subtasks, id || parentId))
    }
  }
  return flattened
}

function collectCompleteParentIds(rawTasks: readonly unknown[]): string[] {
  const parentIds: string[] = []
  for (const raw of rawTasks) {
    const task = asRecord(raw)
    const id = asString(task.id)
    const subtasks = Array.isArray(task.subtasks) ? task.subtasks : null
    const count = asFiniteNumber(task.subtask_count)
    if (id && subtasks && (count === undefined || count <= subtasks.length)) {
      parentIds.push(id, ...collectCompleteParentIds(subtasks))
    }
  }
  return parentIds
}

export function mapClickUpTaskPageResponse(args: {
  response: ClickUpTasksResponse
  listId: string
  workspaceId?: string
  page: number
  filter?: ClickUpTaskFilter
}): ClickUpTaskPage {
  const rawTasks = args.response.tasks ?? []
  const tasks = flattenRawTasks(rawTasks)
    .map((task) => mapClickUpTask(task, args.listId, args.workspaceId))
    .filter((task) => !args.filter || clickUpTaskMatchesFilter(task, args.filter))
  return {
    tasks,
    completeParentIds: collectCompleteParentIds(rawTasks),
    page: args.page,
    hasMore:
      typeof args.response.last_page === 'boolean'
        ? !args.response.last_page
        : rawTasks.length >= CLICKUP_API_PAGE_SIZE
  }
}
