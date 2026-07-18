import type { ClickUpTask } from '../../../shared/types'

export type ClickUpTaskTreeRow = {
  task: ClickUpTask | null
  depth: number
  hasChildren: boolean
  expanded: boolean
  group?: ClickUpTaskGroup
  loadingParentId?: string
  composerParentId?: string
}

export type ClickUpTaskGroup = {
  id: string
  label: string
  count: number
  color?: string
}

export function shouldLoadClickUpTaskChildren(
  task: ClickUpTask,
  hydratedIds: ReadonlySet<string> = new Set()
): boolean {
  if (task.hasSubtasks === false || hydratedIds.has(task.id)) {
    return false
  }
  return true
}

export function getClickUpExpandedTaskIdsNeedingChildLoad(
  tasks: readonly ClickUpTask[],
  expandedIds: ReadonlySet<string>,
  failedIds: ReadonlySet<string>,
  loadingIds: ReadonlySet<string>,
  hydratedIds: ReadonlySet<string>
): string[] {
  return tasks.flatMap((task) =>
    expandedIds.has(task.id) &&
    !failedIds.has(task.id) &&
    !loadingIds.has(task.id) &&
    shouldLoadClickUpTaskChildren(task, hydratedIds)
      ? [task.id]
      : []
  )
}

export function isClickUpTaskChildMetadataPending(
  task: ClickUpTask,
  branchLoading: boolean,
  hasLoadedChildren: boolean
): boolean {
  return branchLoading && task.hasSubtasks === undefined && !hasLoadedChildren
}

export function canExpandClickUpTask(
  task: ClickUpTask,
  hasLoadedChildren: boolean,
  allowUnresolvedDiscovery = true
): boolean {
  if (hasLoadedChildren || task.hasSubtasks === true) {
    return true
  }
  // Why: list responses may omit child metadata; keep discovery user-driven instead of
  // issuing a parent-filtered request for every unresolved task during initial loading.
  return allowUnresolvedDiscovery && task.hasSubtasks === undefined
}

export function getClickUpExpandableTaskIds(
  tasks: readonly ClickUpTask[],
  useTaskSubtaskMetadata = true
): Set<string> {
  const parentIds = new Set(tasks.flatMap((task) => (task.parentId ? [task.parentId] : [])))
  return new Set(
    tasks.flatMap((task) =>
      parentIds.has(task.id) || (useTaskSubtaskMetadata && task.hasSubtasks === true)
        ? [task.id]
        : []
    )
  )
}

function isClickUpTaskClosed(task: ClickUpTask): boolean {
  return Boolean(task.closedAt || task.status?.type === 'closed')
}

export function filterClickUpTasksByClosedVisibility(
  tasks: readonly ClickUpTask[],
  showClosed: boolean,
  mode: 'flat' | 'tree',
  preserveFilteredOrphans = false
): ClickUpTask[] {
  if (mode === 'flat') {
    return showClosed ? [...tasks] : tasks.filter((task) => !isClickUpTaskClosed(task))
  }

  const taskIds = new Set(tasks.map((task) => task.id))
  const childrenByParent = new Map<string, string[]>()
  const hiddenIds = new Set<string>()
  for (const task of tasks) {
    if (task.parentId) {
      childrenByParent.set(task.parentId, [...(childrenByParent.get(task.parentId) ?? []), task.id])
      // A missing parent is usually filtered or not loaded yet; never promote its subtask to a root.
      if (!preserveFilteredOrphans && !taskIds.has(task.parentId)) {
        hiddenIds.add(task.id)
      }
    }
    if (!showClosed && isClickUpTaskClosed(task)) {
      hiddenIds.add(task.id)
    }
  }

  const pending = [...hiddenIds]
  for (let index = 0; index < pending.length; index += 1) {
    for (const childId of childrenByParent.get(pending[index]) ?? []) {
      if (!hiddenIds.has(childId)) {
        hiddenIds.add(childId)
        pending.push(childId)
      }
    }
  }
  return tasks.filter((task) => !hiddenIds.has(task.id))
}

export function getClickUpTaskRows(
  tasks: readonly ClickUpTask[],
  expandedIds: ReadonlySet<string>,
  mode: 'flat' | 'tree',
  pendingChildIds: ReadonlySet<string> = new Set(),
  composerParentId?: string,
  useTaskSubtaskMetadata = true
): ClickUpTaskTreeRow[] {
  if (mode === 'flat') {
    return tasks.flatMap((task) => [
      { task, depth: 0, hasChildren: false, expanded: false },
      ...(task.id === composerParentId
        ? [
            {
              task: null,
              depth: 1,
              hasChildren: false,
              expanded: false,
              composerParentId: task.id
            }
          ]
        : [])
    ])
  }

  const taskIds = new Set(tasks.map((task) => task.id))
  const childrenByParent = new Map<string, ClickUpTask[]>()
  const roots: ClickUpTask[] = []
  for (const task of tasks) {
    const parentId = task.parentId && taskIds.has(task.parentId) ? task.parentId : null
    if (!parentId) {
      roots.push(task)
      continue
    }
    childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), task])
  }

  const rows: ClickUpTaskTreeRow[] = []
  const appended = new Set<string>()
  const append = (task: ClickUpTask, depth: number): void => {
    if (appended.has(task.id)) {
      return
    }
    appended.add(task.id)
    const children = childrenByParent.get(task.id) ?? []
    const expanded = expandedIds.has(task.id)
    rows.push({
      task,
      depth,
      hasChildren: children.length > 0 || (useTaskSubtaskMetadata && task.hasSubtasks === true),
      expanded
    })
    if (expanded) {
      for (const child of children) {
        append(child, depth + 1)
      }
      if (pendingChildIds.has(task.id)) {
        rows.push({
          task: null,
          depth: depth + 1,
          hasChildren: false,
          expanded: false,
          loadingParentId: task.id
        })
      }
      if (task.id === composerParentId) {
        // Why: quick-add belongs after the complete visible branch so existing subtasks
        // remain together and the input reads as the next child in the sequence.
        rows.push({
          task: null,
          depth: depth + 1,
          hasChildren: false,
          expanded: false,
          composerParentId: task.id
        })
      }
    }
  }
  for (const task of roots) {
    append(task, 0)
  }
  return rows
}

export function getClickUpGroupedTaskRows(
  rows: readonly ClickUpTaskTreeRow[],
  getGroup: (task: ClickUpTask) => Omit<ClickUpTaskGroup, 'count'>,
  collapsedGroupIds: ReadonlySet<string> = new Set()
): ClickUpTaskTreeRow[] {
  const groupCounts = new Map<string, number>()
  for (const row of rows) {
    if (row.task && row.depth === 0) {
      const groupId = getGroup(row.task).id
      groupCounts.set(groupId, (groupCounts.get(groupId) ?? 0) + 1)
    }
  }

  const groupedRows: ClickUpTaskTreeRow[] = []
  let activeGroupId: string | null = null
  let activeGroupCollapsed = false
  for (const row of rows) {
    if (row.task && row.depth === 0) {
      const group = getGroup(row.task)
      if (group.id !== activeGroupId) {
        activeGroupId = group.id
        activeGroupCollapsed = collapsedGroupIds.has(group.id)
        groupedRows.push({
          task: null,
          depth: 0,
          hasChildren: true,
          expanded: !activeGroupCollapsed,
          group: { ...group, count: groupCounts.get(group.id) ?? 0 }
        })
      }
    }
    // Why: nested subtasks belong to their root task's section even when their own property differs.
    if (!activeGroupCollapsed) {
      groupedRows.push(row)
    }
  }
  return groupedRows
}
