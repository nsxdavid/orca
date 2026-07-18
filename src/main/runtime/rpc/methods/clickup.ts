import { z } from 'zod'
import { defineMethod, type RpcMethod } from '../core'
import { OptionalPlainString, OptionalString, requiredString } from '../schemas'
import {
  ClickUpFolderListsParams,
  ClickUpListMembersParams,
  ClickUpListTaskPageParams,
  ClickUpListTasksParams,
  ClickUpListTaskSubtasksParams,
  ClickUpListViewTaskPageParams,
  ClickUpListViewsParams,
  ClickUpSearchTasksParams,
  ClickUpSpaceParams,
  ClickUpTaskParams,
  ClickUpWorkspaceParams
} from './clickup-read-rpc-schemas'

const Connect = z.object({
  apiToken: requiredString('API token is required')
})

const CreateTask = z.object({
  listId: requiredString('List is required'),
  name: requiredString('Task name is required'),
  parentTaskId: OptionalString,
  description: OptionalPlainString,
  status: OptionalString,
  priority: z.union([z.number().finite(), z.null()]).optional(),
  customItemId: z.union([z.number().finite(), z.null()]).optional(),
  tagNames: z.array(z.string()).optional(),
  assigneeIds: z.array(z.number().finite()).optional(),
  dueDate: z.number().finite().optional(),
  startDate: z.number().finite().optional(),
  workspaceId: OptionalString
})

const UpdateTask = z.object({
  taskId: requiredString('Task is required'),
  workspaceId: OptionalString,
  updates: z.object({
    name: OptionalString,
    description: OptionalPlainString,
    status: OptionalString,
    priority: z.union([z.number().finite(), z.null()]).optional(),
    customItemId: z.union([z.number().finite(), z.null()]).optional(),
    assigneeIds: z.array(z.number().finite()).optional(),
    addAssigneeIds: z.array(z.number().finite()).optional(),
    removeAssigneeIds: z.array(z.number().finite()).optional(),
    dueDate: z.union([z.number().finite(), z.null()]).optional(),
    startDate: z.union([z.number().finite(), z.null()]).optional()
  })
})

const TaskComment = z.object({
  taskId: requiredString('Task is required'),
  body: requiredString('Comment body is required'),
  workspaceId: OptionalString
})

const TaskTag = z.object({
  taskId: requiredString('Task is required'),
  tagName: requiredString('Tag name is required'),
  workspaceId: OptionalString
})

const TaskComments = z.object({
  taskId: requiredString('Task is required'),
  workspaceId: OptionalString
})

const CommentReply = z.object({
  commentId: requiredString('Comment is required'),
  body: requiredString('Reply body is required'),
  workspaceId: OptionalString
})

const CommentReplies = z.object({
  commentId: requiredString('Comment is required'),
  workspaceId: OptionalString
})

export const CLICKUP_METHODS: RpcMethod[] = [
  defineMethod({
    name: 'clickup.connect',
    params: Connect,
    handler: async (params, { runtime }) => runtime.clickUpConnect(params.apiToken.trim())
  }),
  defineMethod({
    name: 'clickup.disconnect',
    params: null,
    handler: async (_params, { runtime }) => runtime.clickUpDisconnect()
  }),
  defineMethod({
    name: 'clickup.status',
    params: null,
    handler: async (_params, { runtime }) => runtime.clickUpStatus()
  }),
  defineMethod({
    name: 'clickup.testConnection',
    params: null,
    handler: async (_params, { runtime }) => runtime.clickUpTestConnection()
  }),
  defineMethod({
    name: 'clickup.selectWorkspace',
    params: ClickUpWorkspaceParams,
    handler: async (params, { runtime }) =>
      runtime.clickUpSelectWorkspace(params.workspaceId.trim())
  }),
  defineMethod({
    name: 'clickup.listSpaces',
    params: ClickUpWorkspaceParams,
    handler: async (params, { runtime }) => runtime.clickUpListSpaces(params.workspaceId.trim())
  }),
  defineMethod({
    name: 'clickup.listFolders',
    params: ClickUpSpaceParams,
    handler: async (params, { runtime }) =>
      runtime.clickUpListFolders(params.spaceId.trim(), params.workspaceId)
  }),
  defineMethod({
    name: 'clickup.listSpaceTags',
    params: ClickUpSpaceParams,
    handler: async (params, { runtime }) =>
      runtime.clickUpListSpaceTags(params.spaceId.trim(), params.workspaceId)
  }),
  defineMethod({
    name: 'clickup.listTaskTypes',
    params: z.object({ workspaceId: OptionalString }).optional(),
    handler: async (params, { runtime }) => runtime.clickUpListTaskTypes(params?.workspaceId)
  }),
  defineMethod({
    name: 'clickup.listFolderlessLists',
    params: ClickUpSpaceParams,
    handler: async (params, { runtime }) =>
      runtime.clickUpListFolderlessLists(params.spaceId.trim(), params.workspaceId)
  }),
  defineMethod({
    name: 'clickup.listFolderLists',
    params: ClickUpFolderListsParams,
    handler: async (params, { runtime }) =>
      runtime.clickUpListFolderLists(
        params.folderId.trim(),
        params.spaceId.trim(),
        params.workspaceId
      )
  }),
  defineMethod({
    name: 'clickup.listTasks',
    params: ClickUpListTasksParams,
    handler: async (params, { runtime }) =>
      runtime.clickUpListTasks(
        params.listId.trim(),
        params.filter,
        params.limit,
        params.workspaceId
      )
  }),
  defineMethod({
    name: 'clickup.listViews',
    params: ClickUpListViewsParams,
    handler: async (params, { runtime }) =>
      runtime.clickUpListViews(params.listId.trim(), params.workspaceId)
  }),
  defineMethod({
    name: 'clickup.listViewTaskPage',
    params: ClickUpListViewTaskPageParams,
    handler: async (params, { runtime }) =>
      runtime.clickUpListViewTaskPage(
        params.viewId.trim(),
        params.listId.trim(),
        params.page,
        params.workspaceId
      )
  }),
  defineMethod({
    name: 'clickup.listAssignableMembers',
    params: ClickUpListMembersParams,
    handler: async (params, { runtime }) =>
      runtime.clickUpListAssignableMembers(params.listId.trim(), params.workspaceId)
  }),
  defineMethod({
    name: 'clickup.listTaskPage',
    params: ClickUpListTaskPageParams,
    handler: async (params, { runtime }) =>
      runtime.clickUpListTaskPage(
        params.listId.trim(),
        params.filter,
        params.page,
        params.workspaceId,
        params.includeSubtasks
      )
  }),
  defineMethod({
    name: 'clickup.listTaskSubtasks',
    params: ClickUpListTaskSubtasksParams,
    handler: async (params, { runtime }) =>
      runtime.clickUpListTaskSubtasks(
        params.taskId.trim(),
        params.listId.trim(),
        params.filter,
        params.page,
        params.workspaceId,
        params.priority
      )
  }),
  defineMethod({
    name: 'clickup.searchTasks',
    params: ClickUpSearchTasksParams,
    handler: async (params, { runtime }) =>
      runtime.clickUpSearchTasks(
        params.listId.trim(),
        params.query?.trim() ?? '',
        params.limit,
        params.workspaceId
      )
  }),
  defineMethod({
    name: 'clickup.getTask',
    params: ClickUpTaskParams,
    handler: async (params, { runtime }) =>
      runtime.clickUpGetTask(params.taskId.trim(), params.listId.trim(), params.workspaceId)
  }),
  defineMethod({
    name: 'clickup.createTask',
    params: CreateTask,
    handler: async (params, { runtime }) =>
      runtime.clickUpCreateTask(
        {
          listId: params.listId.trim(),
          name: params.name.trim(),
          parentTaskId: params.parentTaskId?.trim() || undefined,
          description: params.description?.trim() || undefined,
          status: params.status,
          priority: params.priority,
          customItemId: params.customItemId,
          tagNames: params.tagNames?.map((tagName) => tagName.trim()).filter(Boolean),
          assigneeIds: params.assigneeIds,
          dueDate: params.dueDate,
          startDate: params.startDate
        },
        params.workspaceId
      )
  }),
  defineMethod({
    name: 'clickup.updateTask',
    params: UpdateTask,
    handler: async (params, { runtime }) =>
      runtime.clickUpUpdateTask(params.taskId.trim(), params.updates, params.workspaceId)
  }),
  defineMethod({
    name: 'clickup.addTaskTag',
    params: TaskTag,
    handler: async (params, { runtime }) =>
      runtime.clickUpAddTaskTag(params.taskId.trim(), params.tagName.trim(), params.workspaceId)
  }),
  defineMethod({
    name: 'clickup.removeTaskTag',
    params: TaskTag,
    handler: async (params, { runtime }) =>
      runtime.clickUpRemoveTaskTag(params.taskId.trim(), params.tagName.trim(), params.workspaceId)
  }),
  defineMethod({
    name: 'clickup.addTaskComment',
    params: TaskComment,
    handler: async (params, { runtime }) =>
      runtime.clickUpAddTaskComment(params.taskId.trim(), params.body.trim(), params.workspaceId)
  }),
  defineMethod({
    name: 'clickup.taskComments',
    params: TaskComments,
    handler: async (params, { runtime }) =>
      runtime.clickUpTaskComments(params.taskId.trim(), params.workspaceId)
  }),
  defineMethod({
    name: 'clickup.addCommentReply',
    params: CommentReply,
    handler: async (params, { runtime }) =>
      runtime.clickUpAddCommentReply(
        params.commentId.trim(),
        params.body.trim(),
        params.workspaceId
      )
  }),
  defineMethod({
    name: 'clickup.commentReplies',
    params: CommentReplies,
    handler: async (params, { runtime }) =>
      runtime.clickUpCommentReplies(params.commentId.trim(), params.workspaceId)
  })
]
