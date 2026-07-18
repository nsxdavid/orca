import type {
  ClickUpListViews,
  ClickUpTaskPage,
  ClickUpView,
  ClickUpViewColumn,
  ClickUpViewConfiguration,
  ClickUpViewDirection,
  ClickUpViewSortField
} from '../../shared/types'
import { acquire, clearToken, getClient, isAuthError, release } from './client'
import { clickUpRequest } from './client'
import { asBoolean, asFiniteNumber, asRecord, asString } from './mappers'
import { mapClickUpTaskPageResponse, type ClickUpTasksResponse } from './task-page-response'

type ListViewsResponse = { views?: unknown; required_views?: unknown }

function mapDirection(value: unknown): ClickUpViewDirection | undefined {
  const direction = Number(asString(value))
  if (direction === 1) {
    return 'ascending'
  }
  if (direction === -1) {
    return 'descending'
  }
  return undefined
}

function mapSortFields(value: unknown): ClickUpViewSortField[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }
  return value.flatMap((entry) => {
    const item = asRecord(entry)
    const field = asString(item.field) || asString(entry)
    if (!field) {
      return []
    }
    return [
      {
        field,
        ...(mapDirection(item.dir) ? { direction: mapDirection(item.dir) } : {}),
        ...(asFiniteNumber(item.idx) !== undefined ? { index: asFiniteNumber(item.idx) } : {})
      }
    ]
  })
}

function mapColumns(value: unknown): ClickUpViewColumn[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }
  return value.flatMap((entry) => {
    const item = asRecord(entry)
    const field = asString(item.field) || asString(entry)
    if (!field) {
      return []
    }
    const width = item.width === null ? null : asFiniteNumber(item.width)
    return [
      {
        field,
        hidden: asBoolean(item.hidden) ?? false,
        ...(asFiniteNumber(item.idx) !== undefined ? { index: asFiniteNumber(item.idx) } : {}),
        ...(width !== undefined ? { width } : {})
      }
    ]
  })
}

function mapSubtaskMode(value: unknown): ClickUpViewConfiguration['subtaskMode'] {
  // Why: ClickUp serializes its three documented subtask modes as an undocumented numeric enum.
  switch (Number(asString(value))) {
    case 1:
      return 'collapsed'
    case 2:
      return 'expanded'
    case 3:
      return 'separate'
    default:
      return undefined
  }
}

function mapViewConfiguration(value: unknown): ClickUpViewConfiguration | undefined {
  const item = asRecord(value)
  const grouping = asRecord(item.grouping)
  const groupingField = asString(grouping.field)
  const collapsedValues = Array.isArray(grouping.collapsed)
    ? grouping.collapsed.map((entry) => asString(entry)).filter(Boolean)
    : []
  const sorting = mapSortFields(asRecord(item.sorting).fields)
  const filters = asRecord(item.filters)
  const columns = mapColumns(asRecord(item.columns).fields)
  const subtaskMode = mapSubtaskMode(asRecord(item.settings).show_subtasks)
  const showClosedTasks = asBoolean(filters.show_closed)
  const configuration: ClickUpViewConfiguration = {
    ...(groupingField
      ? {
          grouping: {
            field: groupingField,
            ...(mapDirection(grouping.dir) ? { direction: mapDirection(grouping.dir) } : {}),
            collapsedValues
          }
        }
      : {}),
    ...(sorting ? { sorting } : {}),
    ...(showClosedTasks !== undefined ? { showClosedTasks } : {}),
    ...(columns ? { columns } : {}),
    ...(subtaskMode ? { subtaskMode } : {})
  }
  return Object.keys(configuration).length > 0 ? configuration : undefined
}

function mapView(value: unknown, required: boolean): ClickUpView | null {
  const item = asRecord(value)
  const id = asString(item.id)
  const name = asString(item.name)
  if (!id || !name) {
    return null
  }
  const configuration = mapViewConfiguration(item)
  return {
    id,
    name,
    type: asString(item.type) || 'list',
    required,
    ...(configuration ? { configuration } : {})
  }
}

function collectViews(value: unknown, required: boolean): ClickUpView[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectViews(entry, required))
  }
  const mapped = mapView(value, required)
  if (mapped) {
    return [mapped]
  }
  const collection = asRecord(value)
  return Object.values(collection).flatMap((entry) => collectViews(entry, required))
}

function uniqueViews(views: ClickUpView[]): ClickUpView[] {
  const seen = new Set<string>()
  return views.filter((view) => {
    if (seen.has(view.id)) {
      return false
    }
    seen.add(view.id)
    return true
  })
}

function connectedClient(workspaceId?: string | null) {
  const client = getClient(workspaceId)
  if (!client) {
    throw new Error('Not connected to ClickUp.')
  }
  return client
}

export async function listViews(
  listId: string,
  workspaceId?: string | null
): Promise<ClickUpListViews> {
  const client = connectedClient(workspaceId)
  await acquire()
  try {
    const response = await clickUpRequest<ListViewsResponse>(
      client,
      `/list/${encodeURIComponent(listId)}/view`
    )
    const requiredViews = uniqueViews(collectViews(response.required_views, true))
    const requiredIds = new Set(requiredViews.map((view) => view.id))
    // Why: ClickUp may key required views by type instead of returning an array.
    const views = uniqueViews(collectViews(response.views, false)).filter(
      (view) => !requiredIds.has(view.id)
    )
    return { views, requiredViews }
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
    }
    throw error
  } finally {
    release()
  }
}

export async function listViewTaskPage(
  viewId: string,
  listId: string,
  page = 0,
  workspaceId?: string | null
): Promise<ClickUpTaskPage> {
  const client = connectedClient(workspaceId)
  const safePage = Math.max(0, Math.floor(page))
  const resolvedWorkspaceId = workspaceId ?? client.workspaceId ?? undefined
  await acquire()
  try {
    const response = await clickUpRequest<ClickUpTasksResponse>(
      client,
      `/view/${encodeURIComponent(viewId)}/task?page=${safePage}`
    )
    // Why: the saved view is authoritative for membership, including closed tasks.
    return mapClickUpTaskPageResponse({
      response,
      listId,
      workspaceId: resolvedWorkspaceId,
      page: safePage
    })
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
    }
    throw error
  } finally {
    release()
  }
}
