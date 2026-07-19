import type {
  ClickUpComment,
  ClickUpFolder,
  ClickUpList,
  ClickUpPriority,
  ClickUpSpace,
  ClickUpStatus,
  ClickUpTag,
  ClickUpTask,
  ClickUpUser
} from '../../shared/types'

export type ClickUpRecord = Record<string, unknown>

export function asRecord(value: unknown): ClickUpRecord {
  return value && typeof value === 'object' ? (value as ClickUpRecord) : {}
}

export function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return fallback
}

export function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

export function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function timestampToIso(value: unknown): string | null {
  const raw = asString(value)
  const millis = Number(raw)
  if (!Number.isFinite(millis) || millis <= 0) {
    return null
  }
  return new Date(millis).toISOString()
}

function asNullableNumber(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return null
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function customItemIdFrom(task: ClickUpRecord): number | null | undefined {
  const direct = asNullableNumber(task.custom_item_id)
  if (direct !== undefined) {
    return direct
  }
  const customItemValue = asNullableNumber(task.custom_item)
  if (customItemValue !== undefined) {
    return customItemValue
  }
  const customItem = asRecord(task.custom_item)
  const customType = asRecord(task.custom_type)
  const taskType = asRecord(task.task_type)
  return (
    asNullableNumber(customItem.id) ??
    asNullableNumber(customItem.custom_item_id) ??
    asNullableNumber(customType.id) ??
    asNullableNumber(customType.custom_item_id) ??
    asNullableNumber(taskType.id) ??
    asNullableNumber(taskType.custom_item_id)
  )
}

function customItemNameFrom(task: ClickUpRecord): string | undefined {
  const customItem = asRecord(task.custom_item)
  const customType = asRecord(task.custom_type)
  const taskType = asRecord(task.task_type)
  return (
    asString(task.custom_item_name) ||
    asString(customItem.name) ||
    asString(customType.name) ||
    asString(taskType.name) ||
    undefined
  )
}

function referenceId(value: unknown): string | null {
  const direct = asString(value)
  if (direct) {
    return direct
  }
  const record = asRecord(value)
  return (
    asString(record.id) ||
    asString(record.task_id) ||
    asString(record.parent_id) ||
    asString(record.parentTaskId) ||
    null
  )
}

function parentIdFrom(task: ClickUpRecord): string | null {
  return (
    referenceId(task.parent) ||
    referenceId(task.parent_id) ||
    referenceId(task.parent_task_id) ||
    null
  )
}

export function mapClickUpUser(value: unknown): ClickUpUser | undefined {
  const user = asRecord(value)
  const id = asString(user.id)
  if (!id) {
    return undefined
  }
  return {
    id,
    username: asString(user.username) || asString(user.email) || 'ClickUp user',
    email: asString(user.email) || null,
    avatarUrl: asString(user.profilePicture) || undefined
  }
}

function mapStatus(value: unknown): ClickUpStatus | undefined {
  const status = asRecord(value)
  const name = asString(status.status)
  if (!name) {
    return undefined
  }
  return {
    status: name,
    type: asString(status.type) || undefined,
    color: asString(status.color) || undefined,
    orderindex: asFiniteNumber(status.orderindex)
  }
}

function mapPriority(value: unknown): ClickUpPriority | undefined {
  const priority = asRecord(value)
  const id = asString(priority.id)
  const name = asString(priority.priority)
  if (!id && !name) {
    return undefined
  }
  return {
    id,
    priority: name || id,
    color: asString(priority.color) || undefined,
    orderindex: asString(priority.orderindex) || undefined
  }
}

export function mapClickUpTag(value: unknown): ClickUpTag | null {
  const tag = asRecord(value)
  const name = asString(tag.name) || asString(tag.tag) || asString(tag.tag_name)
  if (!name) {
    return null
  }
  return {
    name,
    color:
      asString(tag.tag_fg) ||
      asString(tag.color) ||
      asString(tag.tag_bg) ||
      asString(tag.bg_color) ||
      asString(tag.fg_color) ||
      undefined
  }
}

export function mapClickUpSpace(workspaceId: string, raw: unknown): ClickUpSpace | null {
  const space = asRecord(raw)
  const id = asString(space.id)
  const name = asString(space.name)
  if (!id || !name) {
    return null
  }
  return {
    id,
    workspaceId,
    name,
    private: asBoolean(space.private),
    archived: asBoolean(space.archived)
  }
}

export function mapClickUpFolder(
  workspaceId: string,
  spaceId: string,
  raw: unknown
): ClickUpFolder | null {
  const folder = asRecord(raw)
  const id = asString(folder.id)
  const name = asString(folder.name)
  if (!id || !name) {
    return null
  }
  return {
    id,
    workspaceId,
    spaceId,
    name,
    hidden: asBoolean(folder.hidden),
    archived: asBoolean(folder.archived)
  }
}

export function mapClickUpList(
  workspaceId: string,
  spaceId: string,
  folderId: string | null,
  raw: unknown
): ClickUpList | null {
  const list = asRecord(raw)
  const id = asString(list.id)
  const name = asString(list.name)
  if (!id || !name) {
    return null
  }
  return {
    id,
    workspaceId,
    spaceId,
    folderId,
    name,
    content: asString(list.content) || undefined,
    archived: asBoolean(list.archived),
    statuses: Array.isArray(list.statuses)
      ? list.statuses.map(mapStatus).filter((status): status is ClickUpStatus => !!status)
      : undefined
  }
}

export function mapClickUpTask(raw: unknown, listId: string, workspaceId?: string): ClickUpTask {
  const task = asRecord(raw)
  const providedFields = [
    ['assignees', 'assignees'],
    ['date_closed', 'closedAt'],
    ['date_created', 'createdAt'],
    ['description', 'description'],
    ['due_date', 'dueDate'],
    ['markdown_description', 'markdownDescription'],
    ['priority', 'priority'],
    ['start_date', 'startDate'],
    ['status', 'status'],
    ['tags', 'tags'],
    ['date_updated', 'updatedAt'],
    ['url', 'url']
  ]
    .filter(([rawField]) => Object.hasOwn(task, rawField))
    .map(([, mappedField]) => mappedField) as ClickUpTask['providedFields']
  const assignees = Array.isArray(task.assignees)
    ? task.assignees.map(mapClickUpUser).filter((user): user is ClickUpUser => !!user)
    : []
  const tags = Array.isArray(task.tags)
    ? task.tags.map(mapClickUpTag).filter((tag): tag is ClickUpTag => tag !== null)
    : []
  const id = asString(task.id)
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : null
  const subtaskCount = asFiniteNumber(task.subtask_count)
  const resolvedSubtaskCount = subtaskCount ?? subtasks?.length
  return {
    id,
    customId: asString(task.custom_id) || null,
    listId,
    workspaceId,
    parentId: parentIdFrom(task),
    hasSubtasks: resolvedSubtaskCount === undefined ? undefined : resolvedSubtaskCount > 0,
    subtaskCount: resolvedSubtaskCount,
    title: asString(task.name, id || 'Untitled task'),
    description: asString(task.description) || undefined,
    markdownDescription: asString(task.markdown_description) || undefined,
    url: asString(task.url),
    customItemId: customItemIdFrom(task) ?? 0,
    customItemName: customItemNameFrom(task),
    status: mapStatus(task.status),
    priority: mapPriority(task.priority),
    assignees,
    tags,
    dueDate: timestampToIso(task.due_date),
    startDate: timestampToIso(task.start_date),
    createdAt: timestampToIso(task.date_created) ?? new Date().toISOString(),
    updatedAt: timestampToIso(task.date_updated) ?? new Date().toISOString(),
    closedAt: timestampToIso(task.date_closed),
    providedFields
  }
}

export function mapClickUpComment(raw: unknown): ClickUpComment {
  const comment = asRecord(raw)
  const replyCount = asNullableNumber(comment.reply_count)
  return {
    id: asString(comment.id),
    body: asString(comment.comment_text) || asString(comment.comment),
    createdAt: timestampToIso(comment.date) ?? new Date().toISOString(),
    updatedAt: timestampToIso(comment.date_updated) ?? undefined,
    user: mapClickUpUser(comment.user),
    replyCount: replyCount ?? undefined
  }
}
