export type ClickUpWorkspace = {
  id: string
  name: string
  color?: string
  avatarUrl?: string
}

export type ClickUpViewer = {
  id: string
  username: string
  email?: string | null
  avatarUrl?: string
}

export type ClickUpConnectionStatus = {
  connected: boolean
  viewer: ClickUpViewer | null
  workspaces?: ClickUpWorkspace[]
  activeWorkspaceId?: string | null
  selectedWorkspaceId?: string | null
  credentialError?: string
}

export type ClickUpConnectArgs = {
  apiToken: string
}

export type ClickUpSpace = {
  id: string
  workspaceId: string
  name: string
  private?: boolean
  archived?: boolean
}

export type ClickUpFolder = {
  id: string
  workspaceId: string
  spaceId: string
  name: string
  hidden?: boolean
  archived?: boolean
}

export type ClickUpList = {
  id: string
  workspaceId: string
  spaceId: string
  folderId?: string | null
  name: string
  content?: string
  archived?: boolean
  statuses?: ClickUpStatus[]
}

export type ClickUpView = {
  id: string
  name: string
  type: string
  required: boolean
  configuration?: ClickUpViewConfiguration
}

export type ClickUpViewDirection = 'ascending' | 'descending'

export type ClickUpViewGrouping = {
  field: string
  direction?: ClickUpViewDirection
  collapsedValues: string[]
}

export type ClickUpViewSortField = {
  field: string
  direction?: ClickUpViewDirection
  index?: number
}

export type ClickUpViewColumn = {
  field: string
  hidden: boolean
  index?: number
  width?: number | null
}

export type ClickUpViewConfiguration = {
  grouping?: ClickUpViewGrouping
  sorting?: ClickUpViewSortField[]
  showClosedTasks?: boolean
  columns?: ClickUpViewColumn[]
  subtaskMode?: 'collapsed' | 'expanded' | 'separate'
}

export type ClickUpListViews = {
  views: ClickUpView[]
  requiredViews: ClickUpView[]
}

export type ClickUpUser = {
  id: string
  username: string
  email?: string | null
  avatarUrl?: string
}

export type ClickUpStatus = {
  status: string
  type?: string
  color?: string
  orderindex?: number
}

export type ClickUpPriority = {
  id: string
  priority: string
  color?: string
  orderindex?: string
}

export type ClickUpTag = {
  name: string
  color?: string
}

export type ClickUpTaskType = {
  id: number
  name: string
}

export type ClickUpTask = {
  id: string
  customId?: string | null
  listId: string
  workspaceId?: string
  parentId?: string | null
  hasSubtasks?: boolean
  subtaskCount?: number
  title: string
  description?: string
  markdownDescription?: string
  url: string
  customItemId?: number | null
  customItemName?: string
  status?: ClickUpStatus
  priority?: ClickUpPriority
  assignees: ClickUpUser[]
  tags: ClickUpTag[]
  dueDate?: string | null
  startDate?: string | null
  createdAt: string
  updatedAt: string
  closedAt?: string | null
  providedFields?: ClickUpTaskProvidedField[]
}

export type ClickUpTaskProvidedField =
  | 'assignees'
  | 'closedAt'
  | 'createdAt'
  | 'description'
  | 'dueDate'
  | 'markdownDescription'
  | 'priority'
  | 'startDate'
  | 'status'
  | 'tags'
  | 'updatedAt'
  | 'url'

export type ClickUpComment = {
  id: string
  body: string
  createdAt: string
  updatedAt?: string
  user?: ClickUpUser
  replyCount?: number
}

export type ClickUpTaskFilter = 'open' | 'all' | 'closed'

export type ClickUpTaskReadPriority = 'background' | 'interactive'

export type ClickUpTaskPage = {
  tasks: ClickUpTask[]
  discoveredTasks?: ClickUpTask[]
  completeParentIds?: string[]
  page: number
  hasMore: boolean
}

export type ClickUpCreateTaskArgs = {
  listId: string
  name: string
  parentTaskId?: string
  description?: string
  status?: string
  priority?: number | null
  customItemId?: number | null
  tagNames?: string[]
  assigneeIds?: number[]
  dueDate?: number
  startDate?: number
}

export type ClickUpTaskUpdate = {
  name?: string
  description?: string
  status?: string
  priority?: number | null
  customItemId?: number | null
  assigneeIds?: number[]
  addAssigneeIds?: number[]
  removeAssigneeIds?: number[]
  dueDate?: number | null
  startDate?: number | null
}

export type ClickUpCreateTaskResult =
  | { ok: true; id: string; url: string; task?: ClickUpTask }
  | { ok: false; error: string }

export type ClickUpMutationResult = { ok: true } | { ok: false; error: string }
