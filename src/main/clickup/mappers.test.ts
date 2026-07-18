import { describe, expect, it } from 'vitest'

import { mapClickUpComment, mapClickUpTask } from './mappers'

describe('mapClickUpComment', () => {
  it('preserves comment text and parses ClickUp reply counts', () => {
    const comment = mapClickUpComment({
      id: '458',
      comment_text: 'See **the plan** at [Docs](https://example.com/docs).',
      date: '1568036964079',
      reply_count: '2',
      user: {
        id: 183,
        username: 'Mike Anderson',
        profilePicture: 'https://example.com/mike.png'
      }
    })

    expect(comment).toMatchObject({
      id: '458',
      body: 'See **the plan** at [Docs](https://example.com/docs).',
      replyCount: 2,
      user: {
        id: '183',
        username: 'Mike Anderson',
        avatarUrl: 'https://example.com/mike.png'
      }
    })
  })
})

describe('mapClickUpTask', () => {
  it('uses the standard task type and preserves whether a task has subtasks', () => {
    const task = mapClickUpTask(
      {
        id: 'parent',
        name: 'Parent',
        subtasks: [{ id: 'child', name: 'Child' }]
      },
      'list-1'
    )

    expect(task).toMatchObject({ customItemId: 0, hasSubtasks: true, subtaskCount: 1 })
  })

  it('leaves child presence unknown when ClickUp omits subtask metadata', () => {
    const task = mapClickUpTask({ id: 'task-1', name: 'Task' }, 'list-1')

    expect(task.hasSubtasks).toBeUndefined()
  })

  it('prefers ClickUp subtask_count over a partial subtask array', () => {
    const task = mapClickUpTask(
      {
        id: 'parent',
        name: 'Parent',
        subtask_count: 3,
        subtasks: [{ id: 'child', name: 'Child' }]
      },
      'list-1'
    )

    expect(task).toMatchObject({ hasSubtasks: true, subtaskCount: 3 })
  })
})
