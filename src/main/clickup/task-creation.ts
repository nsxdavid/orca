import type { ClickUpCreateTaskArgs, ClickUpTask } from '../../shared/types'
import { clickUpRequest, type ClickUpClient } from './client'
import { mapClickUpTask } from './mappers'

export function buildClickUpCreateTaskPayload(
  args: ClickUpCreateTaskArgs
): Record<string, unknown> {
  return {
    name: args.name.trim(),
    parent: args.parentTaskId,
    description: args.description?.trim() || undefined,
    status: args.status,
    priority: args.priority,
    custom_item_id: args.customItemId,
    assignees: args.assigneeIds,
    due_date: args.dueDate,
    start_date: args.startDate
  }
}

async function repairCreatedTaskParent(
  client: ClickUpClient,
  task: ClickUpTask,
  args: ClickUpCreateTaskArgs,
  workspaceId?: string
): Promise<ClickUpTask> {
  const parentTaskId = args.parentTaskId
  if (!parentTaskId || task.parentId === parentTaskId) {
    return task
  }

  // Why: a successful create is not sufficient for quick-add; ClickUp must confirm that the
  // task landed under the requested parent before Orca reports the subtask as created.
  await clickUpRequest(client, `/task/${encodeURIComponent(task.id)}`, {
    method: 'PUT',
    body: JSON.stringify({ parent: parentTaskId })
  })
  const verified = mapClickUpTask(
    await clickUpRequest(client, `/task/${encodeURIComponent(task.id)}?include_subtasks=true`),
    args.listId,
    workspaceId
  )
  if (verified.parentId !== parentTaskId) {
    throw new Error('ClickUp created the task but did not assign the requested parent task.')
  }
  return verified
}

export async function createClickUpTaskRecord(
  client: ClickUpClient,
  args: ClickUpCreateTaskArgs,
  workspaceId?: string
): Promise<ClickUpTask> {
  const created = mapClickUpTask(
    await clickUpRequest(client, `/list/${encodeURIComponent(args.listId)}/task`, {
      method: 'POST',
      body: JSON.stringify(buildClickUpCreateTaskPayload(args))
    }),
    args.listId,
    workspaceId
  )
  return repairCreatedTaskParent(client, created, args, workspaceId)
}
