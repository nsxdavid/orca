import type { ClickUpTask } from '../../../../shared/types'
import { mergeClickUpTaskRecord } from '../../lib/clickup-task-record-merge'
import type { ClickUpTaskGraph, ClickUpTaskGraphLoadStatus } from './clickup-task-graph-types'

export function createEmptyClickUpTaskGraph(): ClickUpTaskGraph {
  return {
    tasksById: {},
    taskOrder: [],
    rootIds: [],
    childrenByParent: {},
    childrenStateByParent: {},
    rootStatus: 'idle',
    bulkStatus: 'idle',
    generation: 0
  }
}

function rebuildRelations(graph: ClickUpTaskGraph): ClickUpTaskGraph {
  const tasksById = { ...graph.tasksById }
  const rootIds: string[] = []
  const childrenByParent: Record<string, string[]> = {}
  for (const id of graph.taskOrder) {
    const task = graph.tasksById[id]
    if (!task) {
      continue
    }
    if (task.parentId) {
      childrenByParent[task.parentId] = [...(childrenByParent[task.parentId] ?? []), id]
    } else {
      rootIds.push(id)
    }
  }

  for (const [parentId, ids] of Object.entries(childrenByParent)) {
    const parent = tasksById[parentId]
    if (parent && ids.length > 0) {
      // Why: descendant pages arrive progressively; expose the relationship and its loaded
      // count together, then replace it with the exact count when the subtree completes.
      tasksById[parentId] = {
        ...parent,
        hasSubtasks: true,
        subtaskCount: Math.max(parent.subtaskCount ?? 0, ids.length)
      }
    }
  }

  const childrenStateByParent: ClickUpTaskGraph['childrenStateByParent'] = {}
  for (const id of graph.taskOrder) {
    const task = tasksById[id]
    if (!task) {
      continue
    }
    const existing = graph.childrenStateByParent[id]
    const ids = childrenByParent[id] ?? []
    childrenStateByParent[id] = {
      ids,
      status: existing?.status ?? (task.hasSubtasks === false ? 'complete' : 'idle'),
      totalHint: existing?.totalHint ?? task.subtaskCount,
      ...(existing?.error ? { error: existing.error } : {}),
      ...(existing?.needsRevalidation ? { needsRevalidation: true } : {})
    }
  }

  return { ...graph, tasksById, rootIds, childrenByParent, childrenStateByParent }
}

export function mergeClickUpTaskGraphTasks(
  graph: ClickUpTaskGraph,
  tasks: readonly ClickUpTask[],
  completeParentIds: readonly string[] = []
): ClickUpTaskGraph {
  const tasksById = { ...graph.tasksById }
  const taskOrder = [...graph.taskOrder]
  const knownIds = new Set(taskOrder)
  const changedSubtaskCounts = new Map<string, number>()
  for (const task of tasks) {
    const existing = tasksById[task.id]
    if (
      existing?.subtaskCount !== undefined &&
      task.subtaskCount !== undefined &&
      existing.subtaskCount !== task.subtaskCount
    ) {
      changedSubtaskCounts.set(task.id, task.subtaskCount)
    }
    tasksById[task.id] = mergeClickUpTaskRecord(tasksById[task.id], task)
    if (!knownIds.has(task.id)) {
      knownIds.add(task.id)
      taskOrder.push(task.id)
    }
  }

  let next = rebuildRelations({ ...graph, tasksById, taskOrder })
  const childrenStateByParent = { ...next.childrenStateByParent }
  for (const parentId of completeParentIds) {
    const ids = next.childrenByParent[parentId] ?? []
    childrenStateByParent[parentId] = { ids, status: 'complete', totalHint: ids.length }
    const parent = next.tasksById[parentId]
    if (parent) {
      next.tasksById[parentId] = {
        ...parent,
        hasSubtasks: ids.length > 0,
        subtaskCount: ids.length
      }
    }
  }
  for (const [parentId, totalHint] of changedSubtaskCounts) {
    if (completeParentIds.includes(parentId)) {
      continue
    }
    const state = childrenStateByParent[parentId]
    if (state?.status === 'complete') {
      // Why: keep the known branch rendered while its changed child count is quietly reconciled.
      childrenStateByParent[parentId] = {
        ...state,
        totalHint,
        error: undefined,
        needsRevalidation: true
      }
    }
  }
  return { ...next, childrenStateByParent }
}

export function getClickUpTaskGraphRevalidationRootIds(
  graph: ClickUpTaskGraph,
  taskIds: readonly string[]
): Set<string> {
  const roots = new Set<string>()
  for (const taskId of taskIds) {
    let current = graph.tasksById[taskId]
    const visited = new Set<string>()
    while (current?.parentId && !visited.has(current.id)) {
      visited.add(current.id)
      current = graph.tasksById[current.parentId]
    }
    if (current && graph.rootIds.includes(current.id)) {
      roots.add(current.id)
    }
  }
  return roots
}

function collectDescendantIds(graph: ClickUpTaskGraph, rootIds: readonly string[]): Set<string> {
  const descendants = new Set(rootIds)
  const pending = [...rootIds]
  for (let index = 0; index < pending.length; index += 1) {
    for (const childId of graph.childrenByParent[pending[index]] ?? []) {
      if (!descendants.has(childId)) {
        descendants.add(childId)
        pending.push(childId)
      }
    }
  }
  return descendants
}

export function completeClickUpTaskBranch(
  graph: ClickUpTaskGraph,
  parentId: string,
  directChildren: readonly ClickUpTask[],
  discoveredTasks: readonly ClickUpTask[],
  completeParentIds: readonly string[] = []
): ClickUpTaskGraph {
  const nextChildIds = new Set(directChildren.map((task) => task.id))
  const staleRootIds = (graph.childrenByParent[parentId] ?? []).filter(
    (id) => !nextChildIds.has(id)
  )
  const staleIds = collectDescendantIds(graph, staleRootIds)
  const tasksById = Object.fromEntries(
    Object.entries(graph.tasksById).filter(([id]) => !staleIds.has(id))
  )
  const taskOrder = graph.taskOrder.filter((id) => !staleIds.has(id))
  const trimmed = rebuildRelations({ ...graph, tasksById, taskOrder })
  return mergeClickUpTaskGraphTasks(trimmed, discoveredTasks, [...completeParentIds, parentId])
}

export function completeClickUpTaskRootSnapshot(
  graph: ClickUpTaskGraph,
  rootIds: ReadonlySet<string>
): ClickUpTaskGraph {
  const staleRoots = graph.rootIds.filter((id) => !rootIds.has(id))
  const staleIds = collectDescendantIds(graph, staleRoots)
  const tasksById = Object.fromEntries(
    Object.entries(graph.tasksById).filter(([id]) => !staleIds.has(id))
  )
  const taskOrder = graph.taskOrder.filter((id) => !staleIds.has(id))
  return {
    ...rebuildRelations({ ...graph, tasksById, taskOrder }),
    rootStatus: 'complete',
    error: undefined,
    fetchedAt: Date.now()
  }
}

export function completeClickUpTaskViewSnapshot(
  graph: ClickUpTaskGraph,
  visibleIds: ReadonlySet<string>
): ClickUpTaskGraph {
  const tasksById = Object.fromEntries(
    Object.entries(graph.tasksById).filter(([id]) => visibleIds.has(id))
  )
  const taskOrder = graph.taskOrder.filter((id) => visibleIds.has(id))
  return {
    ...rebuildRelations({ ...graph, tasksById, taskOrder }),
    rootStatus: 'complete',
    bulkStatus: 'complete',
    error: undefined,
    fetchedAt: Date.now()
  }
}

export function setClickUpTaskGraphLoadStatus(
  graph: ClickUpTaskGraph,
  field: 'rootStatus' | 'bulkStatus',
  status: ClickUpTaskGraphLoadStatus,
  error?: string
): ClickUpTaskGraph {
  return { ...graph, [field]: status, error }
}

export function replaceClickUpTaskGraphTasks(
  graph: ClickUpTaskGraph,
  tasks: readonly ClickUpTask[]
): ClickUpTaskGraph {
  return rebuildRelations({
    ...graph,
    tasksById: Object.fromEntries(tasks.map((task) => [task.id, task])),
    taskOrder: tasks.map((task) => task.id)
  })
}
