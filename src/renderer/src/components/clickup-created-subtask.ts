import type { ClickUpTask } from '../../../shared/types'

export function upsertClickUpCreatedSubtask(
  tasks: readonly ClickUpTask[],
  parentId: string,
  task: ClickUpTask,
  minimumSubtaskCount: number
): ClickUpTask[] {
  const child = { ...task, parentId }
  const withoutChild = tasks.filter((current) => current.id !== child.id)
  const loadedChildCount =
    withoutChild.filter((current) => current.parentId === parentId).length + 1
  const next = withoutChild.map((current) =>
    current.id === parentId
      ? {
          ...current,
          hasSubtasks: true,
          subtaskCount: Math.max(current.subtaskCount ?? 0, minimumSubtaskCount, loadedChildCount)
        }
      : current
  )
  const lastSiblingIndex = next.findLastIndex((current) => current.parentId === parentId)
  const parentIndex = next.findIndex((current) => current.id === parentId)
  const insertIndex = lastSiblingIndex >= 0 ? lastSiblingIndex + 1 : parentIndex + 1
  next.splice(insertIndex <= 0 ? next.length : insertIndex, 0, child)
  return next
}

export function preserveClickUpCreatedSubtaskPlacement(
  tasks: readonly ClickUpTask[],
  createdTaskIds: readonly string[]
): ClickUpTask[] {
  if (createdTaskIds.length === 0) {
    return [...tasks]
  }
  const createdIds = new Set(createdTaskIds)
  const tasksById = new Map(tasks.map((task) => [task.id, task]))
  return [
    ...tasks.filter((task) => !createdIds.has(task.id)),
    ...createdTaskIds.flatMap((id) => tasksById.get(id) ?? [])
  ]
}
