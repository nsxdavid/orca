import type { ClickUpTask } from '../../../../shared/types'
import { clickUpListTaskSubtasks } from '@/runtime/runtime-clickup-client'
import { getClickUpReadScope } from './clickup-cache'
import type { ClickUpSlice } from './clickup-slice-types'
import { completeClickUpTaskBranch, mergeClickUpTaskGraphTasks } from './clickup-task-graph'
import {
  getClickUpGraphErrorMessage,
  type ClickUpTaskGraphGet,
  type ClickUpTaskGraphSet,
  updateClickUpGraphState
} from './clickup-task-graph-store'

export async function performClickUpTaskBranchLoad(
  args: Parameters<ClickUpSlice['loadClickUpTaskBranch']>[0],
  set: ClickUpTaskGraphSet,
  get: ClickUpTaskGraphGet
): Promise<void> {
  const scope = getClickUpReadScope(get().settings, args.options)
  const generation = get().clickUpTaskGraphs[args.key]?.generation ?? 0
  const quiet =
    args.revalidate &&
    get().clickUpTaskGraphs[args.key]?.childrenStateByParent[args.taskId]?.status === 'complete'
  if (!quiet) {
    updateClickUpGraphState(
      set,
      args.key,
      (graph) => ({
        ...graph,
        childrenStateByParent: {
          ...graph.childrenStateByParent,
          [args.taskId]: {
            ids: graph.childrenByParent[args.taskId] ?? [],
            status: 'loading',
            totalHint: graph.tasksById[args.taskId]?.subtaskCount
          }
        }
      }),
      generation
    )
  }

  const directChildren = new Map<string, ClickUpTask>()
  const discoveredTasks = new Map<string, ClickUpTask>()
  const completeParentIds = new Set<string>()
  try {
    let page = 0
    let hasMore = true
    while (hasMore) {
      const result = await clickUpListTaskSubtasks(
        scope.settings,
        args.taskId,
        args.listId,
        args.filter,
        page,
        args.workspaceId,
        args.priority ?? 'interactive'
      )
      for (const task of result.tasks) {
        directChildren.set(task.id, task)
      }
      for (const task of result.discoveredTasks ?? result.tasks) {
        discoveredTasks.set(task.id, task)
      }
      for (const parentId of result.completeParentIds ?? []) {
        completeParentIds.add(parentId)
      }
      updateClickUpGraphState(
        set,
        args.key,
        (graph) =>
          mergeClickUpTaskGraphTasks(
            graph,
            result.discoveredTasks ?? result.tasks,
            result.completeParentIds
          ),
        generation
      )
      hasMore = result.hasMore
      page += 1
    }
    updateClickUpGraphState(
      set,
      args.key,
      (graph) =>
        completeClickUpTaskBranch(
          graph,
          args.taskId,
          [...directChildren.values()],
          [...discoveredTasks.values()],
          [...completeParentIds]
        ),
      generation
    )
  } catch (error) {
    if (!quiet) {
      updateClickUpGraphState(
        set,
        args.key,
        (graph) => ({
          ...graph,
          childrenStateByParent: {
            ...graph.childrenStateByParent,
            [args.taskId]: {
              ids: graph.childrenByParent[args.taskId] ?? [],
              status: 'error',
              totalHint: graph.tasksById[args.taskId]?.subtaskCount,
              error: getClickUpGraphErrorMessage(error)
            }
          }
        }),
        generation
      )
    }
    throw error
  }
}
