import type { ClickUpTask } from '../../../shared/types'
import { mergeClickUpTask } from './clickup-task-merge'

export function completeClickUpChildDiscovery(
  tasks: readonly ClickUpTask[],
  parentId: string,
  children: Iterable<ClickUpTask>,
  discoveredTasks?: Iterable<ClickUpTask>
): ClickUpTask[] {
  const next = new Map(tasks.map((task) => [task.id, task]))
  const discoveredChildren = [...children]
  const parent = next.get(parentId)
  if (parent) {
    next.set(parentId, {
      ...parent,
      hasSubtasks: discoveredChildren.length > 0,
      subtaskCount: discoveredChildren.length
    })
  }
  for (const task of discoveredTasks ?? discoveredChildren) {
    next.set(task.id, mergeClickUpTask(next.get(task.id), task))
  }
  return [...next.values()]
}
