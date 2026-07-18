import type { ClickUpTask, ClickUpTaskType } from '../../shared/types'
import type { ClickUpClient } from './client'
import { clickUpRequest } from './client'
import { asRecord, asString } from './mappers'

type CustomItemsResponse = { custom_items?: unknown[] }

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export async function listTaskTypes(
  client: ClickUpClient,
  workspaceId: string | undefined
): Promise<ClickUpTaskType[]> {
  const types = new Map<number, string>([
    [0, 'Task'],
    [1, 'Milestone']
  ])
  if (!workspaceId) {
    return [...types].map(([id, name]) => ({ id, name }))
  }
  try {
    const response = await clickUpRequest<CustomItemsResponse>(
      client,
      `/team/${encodeURIComponent(workspaceId)}/custom_item`
    )
    const items = Array.isArray(response.custom_items) ? response.custom_items : []
    for (const raw of items) {
      const item = asRecord(raw)
      const id = asNumber(item.id) ?? asNumber(item.custom_item_id) ?? asNumber(item.customItemId)
      const name = asString(item.name) || asString(item.label) || asString(item.singular_name)
      if (id !== null && name) {
        types.set(id, name)
      }
    }
  } catch (error) {
    console.warn('[clickup] custom task type lookup failed:', error)
  }
  return [...types].map(([id, name]) => ({ id, name }))
}

export async function enrichTaskTypes(
  client: ClickUpClient,
  tasks: ClickUpTask[],
  workspaceId: string | undefined
): Promise<ClickUpTask[]> {
  if (tasks.length === 0) {
    return tasks
  }
  const typeNames = new Map(
    (await listTaskTypes(client, workspaceId)).map((taskType) => [taskType.id, taskType.name])
  )
  return tasks.map((task) =>
    task.customItemId === undefined
      ? task
      : {
          ...task,
          customItemName: task.customItemName ?? typeNames.get(task.customItemId ?? 0)
        }
  )
}
