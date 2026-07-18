import { describe, expect, it } from 'vitest'

import type { ClickUpTask } from '../../../shared/types'
import { applyClickUpTaskTypeNames } from './clickup-task-type-names'

function task(customItemId: number, customItemName?: string): ClickUpTask {
  return {
    id: 'task-1',
    listId: 'list-1',
    title: 'Task',
    url: 'https://app.clickup.com/t/task-1',
    customItemId,
    customItemName,
    assignees: [],
    tags: [],
    createdAt: '2026-07-12T00:00:00.000Z',
    updatedAt: '2026-07-12T00:00:00.000Z'
  }
}

describe('applyClickUpTaskTypeNames', () => {
  it('replaces a numeric custom type fallback with the workspace type name', () => {
    expect(applyClickUpTaskTypeNames([task(1001)], [{ id: 1001, name: 'Feature' }])).toEqual([
      task(1001, 'Feature')
    ])
  })

  it('preserves the task array when every type name is current', () => {
    const tasks = [task(1001, 'Feature')]

    expect(applyClickUpTaskTypeNames(tasks, [{ id: 1001, name: 'Feature' }])).toBe(tasks)
  })
})
