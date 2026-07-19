import type {
  ClickUpTask,
  ClickUpTaskFilter,
  ClickUpTaskReadPriority
} from '../../../../shared/types'
import type { ClickUpReadOptions } from './clickup-cache'

export type ClickUpTaskGraphLoadStatus = 'idle' | 'loading' | 'complete' | 'error'

export type ClickUpTaskChildrenState = {
  ids: string[]
  status: ClickUpTaskGraphLoadStatus
  totalHint?: number
  error?: string
  needsRevalidation?: boolean
}

export type ClickUpTaskGraph = {
  tasksById: Record<string, ClickUpTask>
  taskOrder: string[]
  rootIds: string[]
  childrenByParent: Record<string, string[]>
  childrenStateByParent: Record<string, ClickUpTaskChildrenState>
  rootStatus: ClickUpTaskGraphLoadStatus
  bulkStatus: ClickUpTaskGraphLoadStatus
  error?: string
  fetchedAt?: number
  generation: number
}

export type ClickUpTaskGraphLoadArgs = {
  key: string
  listId: string
  viewId?: string | null
  filter: ClickUpTaskFilter
  workspaceId?: string | null
  options?: ClickUpReadOptions
  force?: boolean
  revalidate?: boolean
  revalidateTaskIds?: readonly string[]
}

export type ClickUpTaskBranchLoadArgs = ClickUpTaskGraphLoadArgs & {
  taskId: string
  priority?: ClickUpTaskReadPriority
}

export type ClickUpTaskGraphUpdater = (tasks: ClickUpTask[]) => ClickUpTask[]
