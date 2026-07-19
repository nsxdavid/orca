import { ipcMain } from 'electron'

import { listAssignableMembers } from '../clickup/assignable-members'
import { listTaskPage, listTaskSubtasks } from '../clickup/task-page-reads'
import { getTask, listTasks, searchTasks } from '../clickup/tasks'
import { listViews, listViewTaskPage } from '../clickup/views'
import type { ClickUpTaskFilter, ClickUpTaskReadPriority } from '../../shared/types'

type ClickUpTaskReadNormalizers = {
  string: (value: unknown) => string | undefined
  filter: (value: unknown) => ClickUpTaskFilter | undefined
  limit: (value: unknown) => number
  number: (value: unknown) => number | undefined
}

export function registerClickUpTaskReadHandlers(normalize: ClickUpTaskReadNormalizers): void {
  ipcMain.handle(
    'clickup:listAssignableMembers',
    async (_event, args: { listId: string; workspaceId?: string }) => {
      const listId = normalize.string(args?.listId)
      return listId ? listAssignableMembers(listId, normalize.string(args?.workspaceId)) : []
    }
  )

  ipcMain.handle(
    'clickup:listViews',
    async (_event, args: { listId: string; workspaceId?: string }) => {
      const listId = normalize.string(args?.listId)
      return listId
        ? listViews(listId, normalize.string(args?.workspaceId))
        : { views: [], requiredViews: [] }
    }
  )

  ipcMain.handle(
    'clickup:listViewTaskPage',
    async (
      _event,
      args: { viewId: string; listId: string; page?: number; workspaceId?: string }
    ) => {
      const viewId = normalize.string(args?.viewId)
      const listId = normalize.string(args?.listId)
      return viewId && listId
        ? listViewTaskPage(
            viewId,
            listId,
            normalize.number(args?.page),
            normalize.string(args?.workspaceId)
          )
        : { tasks: [], page: 0, hasMore: false }
    }
  )

  ipcMain.handle(
    'clickup:listTasks',
    async (
      _event,
      args: { listId: string; filter?: ClickUpTaskFilter; limit?: number; workspaceId?: string }
    ) => {
      const listId = normalize.string(args?.listId)
      return listId
        ? listTasks(
            listId,
            normalize.filter(args?.filter),
            normalize.limit(args?.limit),
            normalize.string(args?.workspaceId)
          )
        : []
    }
  )

  ipcMain.handle(
    'clickup:listTaskPage',
    async (
      _event,
      args: {
        listId: string
        filter?: ClickUpTaskFilter
        page?: number
        workspaceId?: string
        includeSubtasks?: boolean
      }
    ) => {
      const listId = normalize.string(args?.listId)
      return listId
        ? listTaskPage(
            listId,
            normalize.filter(args?.filter),
            normalize.number(args?.page),
            normalize.string(args?.workspaceId),
            args?.includeSubtasks === true
          )
        : { tasks: [], page: 0, hasMore: false }
    }
  )

  ipcMain.handle(
    'clickup:listTaskSubtasks',
    async (
      _event,
      args: {
        taskId: string
        listId: string
        filter?: ClickUpTaskFilter
        page?: number
        workspaceId?: string
        priority?: ClickUpTaskReadPriority
      }
    ) => {
      const taskId = normalize.string(args?.taskId)
      const listId = normalize.string(args?.listId)
      return taskId && listId
        ? listTaskSubtasks(
            taskId,
            listId,
            normalize.filter(args?.filter),
            normalize.number(args?.page),
            normalize.string(args?.workspaceId),
            args?.priority === 'background' ? 'background' : 'interactive'
          )
        : { tasks: [], page: 0, hasMore: false }
    }
  )

  ipcMain.handle(
    'clickup:searchTasks',
    async (
      _event,
      args: { listId: string; query: string; limit?: number; workspaceId?: string }
    ) => {
      const listId = normalize.string(args?.listId)
      return listId && typeof args?.query === 'string'
        ? searchTasks(
            listId,
            args.query,
            normalize.limit(args.limit),
            normalize.string(args.workspaceId)
          )
        : []
    }
  )

  ipcMain.handle(
    'clickup:getTask',
    async (_event, args: { taskId: string; listId: string; workspaceId?: string }) => {
      const taskId = normalize.string(args?.taskId)
      const listId = normalize.string(args?.listId)
      return taskId && listId ? getTask(taskId, listId, normalize.string(args?.workspaceId)) : null
    }
  )
}
