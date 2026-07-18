import { z } from 'zod'
import {
  OptionalFiniteNumber,
  OptionalPlainString,
  OptionalString,
  requiredString
} from '../schemas'

const VALID_FILTERS = ['open', 'all', 'closed'] as const

export const ClickUpWorkspaceParams = z.object({
  workspaceId: requiredString('Workspace is required')
})

export const ClickUpSpaceParams = z.object({
  spaceId: requiredString('Space is required'),
  workspaceId: OptionalString
})

export const ClickUpFolderListsParams = z.object({
  folderId: requiredString('Folder is required'),
  spaceId: requiredString('Space is required'),
  workspaceId: OptionalString
})

export const ClickUpListTasksParams = z.object({
  listId: requiredString('List is required'),
  filter: z.enum(VALID_FILTERS).optional(),
  limit: OptionalFiniteNumber,
  workspaceId: OptionalString
})

export const ClickUpListMembersParams = ClickUpListTasksParams.pick({
  listId: true,
  workspaceId: true
})

export const ClickUpListViewsParams = ClickUpListMembersParams

export const ClickUpListViewTaskPageParams = z.object({
  viewId: requiredString('View is required'),
  listId: requiredString('List is required'),
  page: OptionalFiniteNumber,
  workspaceId: OptionalString
})

export const ClickUpListTaskPageParams = z.object({
  listId: requiredString('List is required'),
  filter: z.enum(VALID_FILTERS).optional(),
  page: OptionalFiniteNumber,
  workspaceId: OptionalString,
  includeSubtasks: z.boolean().optional()
})

export const ClickUpListTaskSubtasksParams = z.object({
  taskId: requiredString('Task is required'),
  listId: requiredString('List is required'),
  filter: z.enum(VALID_FILTERS).optional(),
  page: OptionalFiniteNumber,
  workspaceId: OptionalString,
  priority: z.enum(['background', 'interactive']).optional()
})

export const ClickUpSearchTasksParams = z.object({
  listId: requiredString('List is required'),
  query: OptionalPlainString,
  limit: OptionalFiniteNumber,
  workspaceId: OptionalString
})

export const ClickUpTaskParams = z.object({
  taskId: requiredString('Task is required'),
  listId: requiredString('List is required'),
  workspaceId: OptionalString
})
