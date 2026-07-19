import type {
  ClickUpComment,
  ClickUpConnectionStatus,
  ClickUpFolder,
  ClickUpList,
  ClickUpListViews,
  ClickUpSpace,
  ClickUpTag,
  ClickUpTask,
  ClickUpTaskFilter,
  ClickUpTaskPage,
  ClickUpTaskType,
  ClickUpTaskUpdate,
  ClickUpUser,
  ClickUpViewer
} from '../../../../shared/types'
import type { CacheEntry } from './github'
import type { ClickUpReadOptions } from './clickup-cache'
import type {
  ClickUpTaskBranchLoadArgs,
  ClickUpTaskGraph,
  ClickUpTaskGraphLoadArgs,
  ClickUpTaskGraphUpdater
} from './clickup-task-graph-types'

export type ClickUpSlice = {
  clickUpStatus: ClickUpConnectionStatus
  clickUpStatusChecked: boolean
  clickUpStatusContextKey: string | null
  clickUpHierarchyCache: Record<
    string,
    CacheEntry<ClickUpSpace[] | ClickUpFolder[] | ClickUpList[]>
  >
  clickUpViewCache: Record<string, CacheEntry<ClickUpListViews>>
  clickUpTagCache: Record<string, CacheEntry<ClickUpTag[]>>
  clickUpTaskTypeCache: Record<string, CacheEntry<ClickUpTaskType[]>>
  clickUpMemberCache: Record<string, CacheEntry<ClickUpUser[]>>
  clickUpTaskCache: Record<string, CacheEntry<ClickUpTask | null>>
  clickUpTaskListCache: Record<string, CacheEntry<ClickUpTask[]>>
  clickUpCommentCache: Record<string, CacheEntry<ClickUpComment[]>>
  clickUpTaskGraphs: Record<string, ClickUpTaskGraph>

  checkClickUpConnection: () => Promise<void>
  connectClickUp: (
    apiToken: string
  ) => Promise<{ ok: true; viewer: ClickUpViewer } | { ok: false; error: string }>
  testClickUpConnection: () => Promise<
    { ok: true; viewer: ClickUpViewer } | { ok: false; error: string }
  >
  disconnectClickUp: () => Promise<void>
  selectClickUpWorkspace: (workspaceId: string) => Promise<void>
  fetchClickUpSpaces: (workspaceId: string, options?: ClickUpReadOptions) => Promise<ClickUpSpace[]>
  fetchClickUpFolders: (
    spaceId: string,
    workspaceId?: string | null,
    options?: ClickUpReadOptions
  ) => Promise<ClickUpFolder[]>
  fetchClickUpSpaceTags: (
    spaceId: string,
    workspaceId?: string | null,
    options?: ClickUpReadOptions
  ) => Promise<ClickUpTag[]>
  fetchClickUpTaskTypes: (
    workspaceId?: string | null,
    options?: ClickUpReadOptions
  ) => Promise<ClickUpTaskType[]>
  fetchClickUpAssignableMembers: (
    listId: string,
    workspaceId?: string | null,
    options?: ClickUpReadOptions
  ) => Promise<ClickUpUser[]>
  fetchClickUpFolderlessLists: (
    spaceId: string,
    workspaceId?: string | null,
    options?: ClickUpReadOptions
  ) => Promise<ClickUpList[]>
  fetchClickUpFolderLists: (
    folderId: string,
    spaceId: string,
    workspaceId?: string | null,
    options?: ClickUpReadOptions
  ) => Promise<ClickUpList[]>
  fetchClickUpViews: (
    listId: string,
    workspaceId?: string | null,
    options?: ClickUpReadOptions
  ) => Promise<ClickUpListViews>
  listClickUpTasks: (
    listId: string,
    filter?: ClickUpTaskFilter,
    limit?: number,
    workspaceId?: string | null,
    options?: ClickUpReadOptions
  ) => Promise<ClickUpTask[]>
  listClickUpTaskPage: (
    listId: string,
    filter: ClickUpTaskFilter,
    page: number,
    workspaceId?: string | null,
    includeSubtasks?: boolean,
    options?: ClickUpReadOptions
  ) => Promise<ClickUpTaskPage>
  listClickUpTaskSubtasks: (
    taskId: string,
    listId: string,
    filter: ClickUpTaskFilter,
    page: number,
    workspaceId?: string | null,
    options?: ClickUpReadOptions
  ) => Promise<ClickUpTaskPage>
  loadClickUpTaskGraph: (args: ClickUpTaskGraphLoadArgs) => Promise<void>
  loadClickUpTaskBranch: (args: ClickUpTaskBranchLoadArgs) => Promise<void>
  resetClickUpTaskGraph: (key: string) => void
  seedClickUpTaskGraph: (targetKey: string, sourceKey: string) => void
  updateClickUpTaskGraphTasks: (key: string, updater: ClickUpTaskGraphUpdater) => void
  searchClickUpTasks: (
    listId: string,
    query: string,
    limit?: number,
    workspaceId?: string | null,
    options?: ClickUpReadOptions
  ) => Promise<ClickUpTask[]>
  fetchClickUpTask: (
    taskId: string,
    listId: string,
    workspaceId?: string | null,
    options?: ClickUpReadOptions
  ) => Promise<ClickUpTask | null>
  updateClickUpTask: (
    taskId: string,
    updates: ClickUpTaskUpdate,
    workspaceId?: string | null,
    options?: ClickUpReadOptions
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  addClickUpTaskTag: (
    taskId: string,
    tagName: string,
    workspaceId?: string | null,
    options?: ClickUpReadOptions
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  removeClickUpTaskTag: (
    taskId: string,
    tagName: string,
    workspaceId?: string | null,
    options?: ClickUpReadOptions
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  fetchClickUpTaskComments: (
    taskId: string,
    workspaceId?: string | null,
    options?: ClickUpReadOptions
  ) => Promise<ClickUpComment[]>
  addClickUpTaskComment: (
    taskId: string,
    body: string,
    workspaceId?: string | null,
    options?: ClickUpReadOptions
  ) => Promise<{ ok: true; id: string } | { ok: false; error: string }>
  fetchClickUpCommentReplies: (
    commentId: string,
    workspaceId?: string | null,
    options?: ClickUpReadOptions
  ) => Promise<ClickUpComment[]>
  addClickUpCommentReply: (
    commentId: string,
    body: string,
    workspaceId?: string | null,
    options?: ClickUpReadOptions
  ) => Promise<{ ok: true; id: string } | { ok: false; error: string }>
  patchClickUpTask: (
    taskId: string,
    patch: Partial<ClickUpTask>,
    options?: ClickUpReadOptions
  ) => void
}
