import type {
  ClickUpConnectionStatus,
  ClickUpCreateTaskArgs,
  ClickUpCreateTaskResult,
  ClickUpFolder,
  ClickUpList,
  ClickUpMutationResult,
  ClickUpSpace,
  ClickUpTag,
  ClickUpTask,
  ClickUpTaskFilter,
  ClickUpTaskPage,
  ClickUpTaskReadPriority,
  ClickUpTaskType,
  ClickUpTaskUpdate,
  ClickUpViewer,
  GlobalSettings
} from '../../../shared/types'
import {
  getTaskSourceRuntimeSettings,
  type TaskSourceContext
} from '../../../shared/task-source-context'
import { callRuntimeRpc, getActiveRuntimeTarget } from './runtime-rpc-client'
import { isRuntimeProviderSearchQueryWithinLimit } from './runtime-provider-search-bounds'

export type RuntimeClickUpSettings =
  | Pick<GlobalSettings, 'activeRuntimeEnvironmentId'>
  | TaskSourceContext
  | null
  | undefined

export type ClickUpConnectResult =
  | { ok: true; viewer: ClickUpViewer }
  | { ok: false; error: string }

function isTaskSourceRuntimeSettings(
  settings: RuntimeClickUpSettings
): settings is TaskSourceContext {
  return settings !== null && settings !== undefined && 'kind' in settings
}

export function getClickUpRuntimeTarget(
  settings: RuntimeClickUpSettings
): ReturnType<typeof getActiveRuntimeTarget> {
  return getActiveRuntimeTarget(
    isTaskSourceRuntimeSettings(settings) ? getTaskSourceRuntimeSettings(settings) : settings
  )
}

export async function clickUpStatus(
  settings: RuntimeClickUpSettings
): Promise<ClickUpConnectionStatus> {
  const target = getClickUpRuntimeTarget(settings)
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpConnectionStatus>(target, 'clickup.status', undefined, {
        timeoutMs: 15_000
      })
    : window.api.clickup.status()
}

export async function clickUpConnect(
  settings: RuntimeClickUpSettings,
  apiToken: string
): Promise<ClickUpConnectResult> {
  const target = getClickUpRuntimeTarget(settings)
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpConnectResult>(
        target,
        'clickup.connect',
        { apiToken },
        {
          timeoutMs: 30_000
        }
      )
    : window.api.clickup.connect({ apiToken })
}

export async function clickUpDisconnect(settings: RuntimeClickUpSettings): Promise<void> {
  const target = getClickUpRuntimeTarget(settings)
  if (target.kind === 'environment') {
    await callRuntimeRpc<{ ok: true }>(target, 'clickup.disconnect', undefined, {
      timeoutMs: 15_000
    })
    return
  }
  await window.api.clickup.disconnect()
}

export async function clickUpSelectWorkspace(
  settings: RuntimeClickUpSettings,
  workspaceId: string
): Promise<ClickUpConnectionStatus> {
  const target = getClickUpRuntimeTarget(settings)
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpConnectionStatus>(
        target,
        'clickup.selectWorkspace',
        { workspaceId },
        { timeoutMs: 15_000 }
      )
    : window.api.clickup.selectWorkspace({ workspaceId })
}

export async function clickUpTestConnection(
  settings: RuntimeClickUpSettings
): Promise<ClickUpConnectResult> {
  const target = getClickUpRuntimeTarget(settings)
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpConnectResult>(target, 'clickup.testConnection', undefined, {
        timeoutMs: 30_000
      })
    : window.api.clickup.testConnection()
}

export async function clickUpListSpaces(
  settings: RuntimeClickUpSettings,
  workspaceId: string
): Promise<ClickUpSpace[]> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { workspaceId }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpSpace[]>(target, 'clickup.listSpaces', args, { timeoutMs: 30_000 })
    : window.api.clickup.listSpaces(args)
}

export async function clickUpListFolders(
  settings: RuntimeClickUpSettings,
  spaceId: string,
  workspaceId?: string | null
): Promise<ClickUpFolder[]> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { spaceId, workspaceId: workspaceId ?? undefined }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpFolder[]>(target, 'clickup.listFolders', args, { timeoutMs: 30_000 })
    : window.api.clickup.listFolders(args)
}

export async function clickUpListSpaceTags(
  settings: RuntimeClickUpSettings,
  spaceId: string,
  workspaceId?: string | null
): Promise<ClickUpTag[]> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { spaceId, workspaceId: workspaceId ?? undefined }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpTag[]>(target, 'clickup.listSpaceTags', args, { timeoutMs: 30_000 })
    : window.api.clickup.listSpaceTags(args)
}

export async function clickUpListTaskTypes(
  settings: RuntimeClickUpSettings,
  workspaceId?: string | null
): Promise<ClickUpTaskType[]> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { workspaceId: workspaceId ?? undefined }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpTaskType[]>(target, 'clickup.listTaskTypes', args, {
        timeoutMs: 30_000
      })
    : window.api.clickup.listTaskTypes(args)
}

export async function clickUpListFolderlessLists(
  settings: RuntimeClickUpSettings,
  spaceId: string,
  workspaceId?: string | null
): Promise<ClickUpList[]> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { spaceId, workspaceId: workspaceId ?? undefined }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpList[]>(target, 'clickup.listFolderlessLists', args, {
        timeoutMs: 30_000
      })
    : window.api.clickup.listFolderlessLists(args)
}

export async function clickUpListFolderLists(
  settings: RuntimeClickUpSettings,
  folderId: string,
  spaceId: string,
  workspaceId?: string | null
): Promise<ClickUpList[]> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { folderId, spaceId, workspaceId: workspaceId ?? undefined }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpList[]>(target, 'clickup.listFolderLists', args, {
        timeoutMs: 30_000
      })
    : window.api.clickup.listFolderLists(args)
}

export async function clickUpListTasks(
  settings: RuntimeClickUpSettings,
  listId: string,
  filter?: ClickUpTaskFilter,
  limit?: number,
  workspaceId?: string | null
): Promise<ClickUpTask[]> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { listId, filter, limit, workspaceId: workspaceId ?? undefined }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpTask[]>(target, 'clickup.listTasks', args, { timeoutMs: 120_000 })
    : window.api.clickup.listTasks(args)
}

export async function clickUpListTaskPage(
  settings: RuntimeClickUpSettings,
  listId: string,
  filter: ClickUpTaskFilter,
  page: number,
  workspaceId?: string | null,
  includeSubtasks = false
): Promise<ClickUpTaskPage> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { listId, filter, page, workspaceId: workspaceId ?? undefined, includeSubtasks }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpTaskPage>(target, 'clickup.listTaskPage', args, { timeoutMs: 75_000 })
    : window.api.clickup.listTaskPage(args)
}

export async function clickUpListTaskSubtasks(
  settings: RuntimeClickUpSettings,
  taskId: string,
  listId: string,
  filter: ClickUpTaskFilter,
  page: number,
  workspaceId?: string | null,
  priority: ClickUpTaskReadPriority = 'interactive'
): Promise<ClickUpTaskPage> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { taskId, listId, filter, page, workspaceId: workspaceId ?? undefined, priority }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpTaskPage>(target, 'clickup.listTaskSubtasks', args, {
        timeoutMs: 75_000
      })
    : window.api.clickup.listTaskSubtasks(args)
}

export async function clickUpSearchTasks(
  settings: RuntimeClickUpSettings,
  listId: string,
  query: string,
  limit?: number,
  workspaceId?: string | null
): Promise<ClickUpTask[]> {
  if (!isRuntimeProviderSearchQueryWithinLimit(query)) {
    return []
  }
  const target = getClickUpRuntimeTarget(settings)
  const args = { listId, query, limit, workspaceId: workspaceId ?? undefined }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpTask[]>(target, 'clickup.searchTasks', args, { timeoutMs: 120_000 })
    : window.api.clickup.searchTasks(args)
}

export async function clickUpGetTask(
  settings: RuntimeClickUpSettings,
  taskId: string,
  listId: string,
  workspaceId?: string | null
): Promise<ClickUpTask | null> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { taskId, listId, workspaceId: workspaceId ?? undefined }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpTask | null>(target, 'clickup.getTask', args, { timeoutMs: 30_000 })
    : window.api.clickup.getTask(args)
}

export async function clickUpCreateTask(
  settings: RuntimeClickUpSettings,
  args: ClickUpCreateTaskArgs & { workspaceId?: string }
): Promise<ClickUpCreateTaskResult> {
  const target = getClickUpRuntimeTarget(settings)
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpCreateTaskResult>(target, 'clickup.createTask', args, {
        timeoutMs: 30_000
      })
    : window.api.clickup.createTask(args)
}

export async function clickUpUpdateTask(
  settings: RuntimeClickUpSettings,
  taskId: string,
  updates: ClickUpTaskUpdate,
  workspaceId?: string | null
): Promise<ClickUpMutationResult> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { taskId, updates, workspaceId: workspaceId ?? undefined }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpMutationResult>(target, 'clickup.updateTask', args, {
        timeoutMs: 30_000
      })
    : window.api.clickup.updateTask(args)
}

export async function clickUpAddTaskTag(
  settings: RuntimeClickUpSettings,
  taskId: string,
  tagName: string,
  workspaceId?: string | null
): Promise<ClickUpMutationResult> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { taskId, tagName, workspaceId: workspaceId ?? undefined }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpMutationResult>(target, 'clickup.addTaskTag', args, {
        timeoutMs: 30_000
      })
    : window.api.clickup.addTaskTag(args)
}

export async function clickUpRemoveTaskTag(
  settings: RuntimeClickUpSettings,
  taskId: string,
  tagName: string,
  workspaceId?: string | null
): Promise<ClickUpMutationResult> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { taskId, tagName, workspaceId: workspaceId ?? undefined }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpMutationResult>(target, 'clickup.removeTaskTag', args, {
        timeoutMs: 30_000
      })
    : window.api.clickup.removeTaskTag(args)
}
