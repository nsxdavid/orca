import type { ClickUpTaskUpdate } from '../../shared/types'

export function buildTaskUpdatePayload(updates: ClickUpTaskUpdate): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  if (updates.name !== undefined) {
    payload.name = updates.name
  }
  if (updates.description !== undefined) {
    payload.description = updates.description
  }
  if (updates.status !== undefined) {
    payload.status = updates.status
  }
  if (updates.priority !== undefined) {
    payload.priority = updates.priority
  }
  if (updates.customItemId !== undefined) {
    payload.custom_item_id = updates.customItemId
  }
  if (
    updates.assigneeIds !== undefined ||
    updates.addAssigneeIds !== undefined ||
    updates.removeAssigneeIds !== undefined
  ) {
    payload.assignees = {
      add: updates.addAssigneeIds ?? updates.assigneeIds ?? [],
      rem: updates.removeAssigneeIds ?? []
    }
  }
  if (updates.dueDate !== undefined) {
    payload.due_date = updates.dueDate
  }
  if (updates.startDate !== undefined) {
    payload.start_date = updates.startDate
  }
  return payload
}
