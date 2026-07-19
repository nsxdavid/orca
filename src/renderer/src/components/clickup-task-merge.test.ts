import { describe, expect, it } from 'vitest'

import type { ClickUpTask } from '../../../shared/types'
import { mergeClickUpTask } from './clickup-task-merge'

function task(overrides: Partial<ClickUpTask> = {}): ClickUpTask {
  return {
    id: 'task-1',
    listId: 'list-1',
    parentId: null,
    title: 'Task',
    url: 'https://app.clickup.com/t/task-1',
    assignees: [],
    tags: [],
    createdAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:00:00.000Z',
    ...overrides
  }
}

describe('mergeClickUpTask', () => {
  it('does not erase resolved child metadata with an incomplete later row', () => {
    const existing = task({ hasSubtasks: true, subtaskCount: 3 })
    const incoming = task({ title: 'Updated task' })

    expect(mergeClickUpTask(existing, incoming)).toMatchObject({
      title: 'Updated task',
      hasSubtasks: true,
      subtaskCount: 3
    })
  })

  it('accepts newer resolved child metadata', () => {
    const existing = task({ hasSubtasks: true, subtaskCount: 3 })
    const incoming = task({ hasSubtasks: false, subtaskCount: 0 })

    expect(mergeClickUpTask(existing, incoming)).toMatchObject({
      hasSubtasks: false,
      subtaskCount: 0
    })
  })

  it('does not erase rich fields that a compact child row omitted', () => {
    const existing = task({
      assignees: [{ id: '1', username: 'Mike', email: null }],
      tags: [{ name: 'ready' }],
      markdownDescription: '**Detailed**'
    })
    const incoming = task({
      assignees: [],
      tags: [],
      markdownDescription: undefined,
      providedFields: ['updatedAt']
    })

    expect(mergeClickUpTask(existing, incoming)).toMatchObject({
      assignees: existing.assignees,
      tags: existing.tags,
      markdownDescription: '**Detailed**'
    })
  })
})
