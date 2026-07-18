import type { ClickUpTask } from '../../../shared/types'

export function mergeClickUpTaskRecord(
  existing: ClickUpTask | undefined,
  incoming: ClickUpTask
): ClickUpTask {
  if (!existing) {
    return incoming
  }
  const provided = (field: NonNullable<ClickUpTask['providedFields']>[number]): boolean =>
    incoming.providedFields === undefined || incoming.providedFields.includes(field)
  return {
    ...existing,
    ...incoming,
    assignees: provided('assignees') ? incoming.assignees : existing.assignees,
    closedAt: provided('closedAt') ? incoming.closedAt : existing.closedAt,
    createdAt: provided('createdAt') ? incoming.createdAt : existing.createdAt,
    description: provided('description') ? incoming.description : existing.description,
    dueDate: provided('dueDate') ? incoming.dueDate : existing.dueDate,
    markdownDescription: provided('markdownDescription')
      ? incoming.markdownDescription
      : existing.markdownDescription,
    priority: provided('priority') ? incoming.priority : existing.priority,
    startDate: provided('startDate') ? incoming.startDate : existing.startDate,
    status: provided('status') ? incoming.status : existing.status,
    tags: provided('tags') ? incoming.tags : existing.tags,
    updatedAt: provided('updatedAt') ? incoming.updatedAt : existing.updatedAt,
    url: provided('url') ? incoming.url : existing.url,
    hasSubtasks: incoming.hasSubtasks ?? existing.hasSubtasks,
    subtaskCount: incoming.subtaskCount ?? existing.subtaskCount
  }
}
