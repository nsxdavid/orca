import { ipcMain } from 'electron'
import { connect, disconnect, getStatus, selectWorkspace, testConnection } from '../clickup/client'
import {
  listFolderLists,
  listFolderlessLists,
  listFolders,
  listSpaceTags,
  listSpaces
} from '../clickup/hierarchy'
import {
  addCommentReply,
  addTaskComment,
  getCommentReplies,
  getTaskComments
} from '../clickup/task-comments'
import { createTask, listTaskTypes, updateTask } from '../clickup/tasks'
import { addTaskTag, removeTaskTag } from '../clickup/task-tags'
import type {
  ClickUpCreateTaskArgs,
  ClickUpTaskFilter,
  ClickUpTaskUpdate
} from '../../shared/types'
import { _resetPreflightCache } from './preflight'
import { registerClickUpTaskReadHandlers } from './clickup-task-read-handlers'

const VALID_FILTERS = new Set<ClickUpTaskFilter>(['open', 'all', 'closed'])

function normalizeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeTaskFilter(value: unknown): ClickUpTaskFilter | undefined {
  return VALID_FILTERS.has(value as ClickUpTaskFilter) ? (value as ClickUpTaskFilter) : undefined
}

function clampLimit(value: unknown, fallback = 30): number {
  const limit = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.max(1, limit)
}

function normalizeNumberArray(value: unknown): number[] | undefined {
  if (value === undefined) {
    return undefined
  }
  return Array.isArray(value) && value.every((item) => Number.isFinite(item))
    ? value.map(Number)
    : undefined
}

function normalizeFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!Array.isArray(value)) {
    return undefined
  }
  const names = value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
  return names.length > 0 ? [...new Set(names)] : undefined
}

function normalizeTaskUpdate(value: unknown): ClickUpTaskUpdate | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const input = value as ClickUpTaskUpdate
  if (input.name !== undefined && typeof input.name !== 'string') {
    return null
  }
  if (input.description !== undefined && typeof input.description !== 'string') {
    return null
  }
  if (input.status !== undefined && typeof input.status !== 'string') {
    return null
  }
  if (
    input.priority !== undefined &&
    input.priority !== null &&
    typeof input.priority !== 'number'
  ) {
    return null
  }
  if (
    input.customItemId !== undefined &&
    input.customItemId !== null &&
    typeof input.customItemId !== 'number'
  ) {
    return null
  }
  if (input.assigneeIds !== undefined && normalizeNumberArray(input.assigneeIds) === undefined) {
    return null
  }
  if (
    input.addAssigneeIds !== undefined &&
    normalizeNumberArray(input.addAssigneeIds) === undefined
  ) {
    return null
  }
  if (
    input.removeAssigneeIds !== undefined &&
    normalizeNumberArray(input.removeAssigneeIds) === undefined
  ) {
    return null
  }
  return input
}

export function registerClickUpHandlers(): void {
  registerClickUpTaskReadHandlers({
    string: normalizeString,
    filter: normalizeTaskFilter,
    limit: clampLimit,
    number: normalizeFiniteNumber
  })

  ipcMain.handle('clickup:connect', async (_event, args: { apiToken: string }) => {
    if (typeof args?.apiToken !== 'string') {
      return { ok: false, error: 'API token is required.' }
    }
    const result = await connect({ apiToken: args.apiToken })
    if (result.ok) {
      _resetPreflightCache()
    }
    return result
  })

  ipcMain.handle('clickup:disconnect', async () => {
    disconnect()
    _resetPreflightCache()
  })

  ipcMain.handle('clickup:status', async () => getStatus())

  ipcMain.handle('clickup:testConnection', async () => testConnection())

  ipcMain.handle('clickup:selectWorkspace', async (_event, args: { workspaceId: string }) => {
    const workspaceId = normalizeString(args?.workspaceId)
    return workspaceId ? selectWorkspace(workspaceId) : getStatus()
  })

  ipcMain.handle('clickup:listSpaces', async (_event, args: { workspaceId: string }) => {
    const workspaceId = normalizeString(args?.workspaceId)
    return workspaceId ? listSpaces(workspaceId) : []
  })

  ipcMain.handle(
    'clickup:listFolders',
    async (_event, args: { spaceId: string; workspaceId?: string }) => {
      const spaceId = normalizeString(args?.spaceId)
      return spaceId ? listFolders(spaceId, normalizeString(args?.workspaceId)) : []
    }
  )

  ipcMain.handle(
    'clickup:listSpaceTags',
    async (_event, args: { spaceId: string; workspaceId?: string }) => {
      const spaceId = normalizeString(args?.spaceId)
      return spaceId ? listSpaceTags(spaceId, normalizeString(args?.workspaceId)) : []
    }
  )

  ipcMain.handle(
    'clickup:listTaskTypes',
    async (_event, args: { workspaceId?: string } | undefined) =>
      listTaskTypes(normalizeString(args?.workspaceId))
  )

  ipcMain.handle(
    'clickup:listFolderlessLists',
    async (_event, args: { spaceId: string; workspaceId?: string }) => {
      const spaceId = normalizeString(args?.spaceId)
      return spaceId ? listFolderlessLists(spaceId, normalizeString(args?.workspaceId)) : []
    }
  )

  ipcMain.handle(
    'clickup:listFolderLists',
    async (_event, args: { folderId: string; spaceId: string; workspaceId?: string }) => {
      const folderId = normalizeString(args?.folderId)
      const spaceId = normalizeString(args?.spaceId)
      return folderId && spaceId
        ? listFolderLists(folderId, spaceId, normalizeString(args?.workspaceId))
        : []
    }
  )

  ipcMain.handle(
    'clickup:createTask',
    async (_event, args: ClickUpCreateTaskArgs & { workspaceId?: string }) => {
      const listId = normalizeString(args?.listId)
      const name = normalizeString(args?.name)
      if (!listId || !name) {
        return { ok: false, error: 'List and task name are required.' }
      }
      return createTask(
        {
          ...args,
          listId,
          name,
          parentTaskId: normalizeString(args?.parentTaskId),
          description: normalizeString(args?.description),
          status: normalizeString(args?.status),
          priority: args?.priority === null ? null : normalizeFiniteNumber(args?.priority),
          customItemId:
            args?.customItemId === null ? null : normalizeFiniteNumber(args?.customItemId),
          tagNames: normalizeStringArray(args?.tagNames),
          assigneeIds: normalizeNumberArray(args?.assigneeIds)
        },
        normalizeString(args.workspaceId)
      )
    }
  )

  ipcMain.handle(
    'clickup:updateTask',
    async (_event, args: { taskId: string; updates: ClickUpTaskUpdate; workspaceId?: string }) => {
      const taskId = normalizeString(args?.taskId)
      const updates = normalizeTaskUpdate(args?.updates)
      return taskId && updates
        ? updateTask(taskId, updates, normalizeString(args?.workspaceId))
        : { ok: false, error: 'Task and updates are required.' }
    }
  )

  ipcMain.handle(
    'clickup:addTaskTag',
    async (_event, args: { taskId: string; tagName: string; workspaceId?: string }) => {
      const taskId = normalizeString(args?.taskId)
      const tagName = normalizeString(args?.tagName)
      return taskId && tagName
        ? addTaskTag(taskId, tagName, normalizeString(args?.workspaceId))
        : { ok: false, error: 'Task and tag name are required.' }
    }
  )

  ipcMain.handle(
    'clickup:removeTaskTag',
    async (_event, args: { taskId: string; tagName: string; workspaceId?: string }) => {
      const taskId = normalizeString(args?.taskId)
      const tagName = normalizeString(args?.tagName)
      return taskId && tagName
        ? removeTaskTag(taskId, tagName, normalizeString(args?.workspaceId))
        : { ok: false, error: 'Task and tag name are required.' }
    }
  )

  ipcMain.handle(
    'clickup:taskComments',
    async (_event, args: { taskId: string; workspaceId?: string }) => {
      const taskId = normalizeString(args?.taskId)
      return taskId ? getTaskComments(taskId, normalizeString(args?.workspaceId)) : []
    }
  )

  ipcMain.handle(
    'clickup:addTaskComment',
    async (_event, args: { taskId: string; body: string; workspaceId?: string }) => {
      const taskId = normalizeString(args?.taskId)
      const body = normalizeString(args?.body)
      return taskId && body
        ? addTaskComment(taskId, body, normalizeString(args?.workspaceId))
        : { ok: false, error: 'Task and comment body are required.' }
    }
  )

  ipcMain.handle(
    'clickup:commentReplies',
    async (_event, args: { commentId: string; workspaceId?: string }) => {
      const commentId = normalizeString(args?.commentId)
      return commentId ? getCommentReplies(commentId, normalizeString(args?.workspaceId)) : []
    }
  )

  ipcMain.handle(
    'clickup:addCommentReply',
    async (_event, args: { commentId: string; body: string; workspaceId?: string }) => {
      const commentId = normalizeString(args?.commentId)
      const body = normalizeString(args?.body)
      return commentId && body
        ? addCommentReply(commentId, body, normalizeString(args?.workspaceId))
        : { ok: false, error: 'Comment and reply body are required.' }
    }
  )
}
