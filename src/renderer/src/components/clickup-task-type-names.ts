import type { ClickUpTask, ClickUpTaskType } from '../../../shared/types'

export function applyClickUpTaskTypeNames(
  tasks: ClickUpTask[],
  taskTypes: readonly ClickUpTaskType[]
): ClickUpTask[] {
  if (tasks.length === 0 || taskTypes.length === 0) {
    return tasks
  }
  const namesById = new Map(taskTypes.map((taskType) => [taskType.id, taskType.name]))
  let changed = false
  const next = tasks.map((task) => {
    const name = namesById.get(task.customItemId ?? 0)
    if (!name || task.customItemName === name) {
      return task
    }
    changed = true
    return { ...task, customItemName: name }
  })
  return changed ? next : tasks
}
