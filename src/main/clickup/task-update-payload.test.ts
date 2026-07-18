import { describe, expect, it } from 'vitest'

import { buildTaskUpdatePayload } from './task-update-payload'

describe('buildTaskUpdatePayload', () => {
  it('uses ClickUp add and remove arrays for assignee mutations', () => {
    expect(buildTaskUpdatePayload({ addAssigneeIds: [1], removeAssigneeIds: [2] })).toEqual({
      assignees: { add: [1], rem: [2] }
    })
  })
})
