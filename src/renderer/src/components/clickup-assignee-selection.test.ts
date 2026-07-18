import { describe, expect, it } from 'vitest'

import type { ClickUpUser } from '../../../shared/types'
import { getClickUpAssigneeCandidates, toggleClickUpAssignee } from './clickup-assignee-selection'

const ada: ClickUpUser = { id: '1', username: 'Ada' }
const grace: ClickUpUser = { id: '2', username: 'Grace' }

describe('ClickUp assignee selection', () => {
  it('keeps current assignees available when member discovery omits them', () => {
    expect(getClickUpAssigneeCandidates([grace], [ada])).toEqual([grace, ada])
  })

  it('adds and removes a member without changing unrelated assignees', () => {
    expect(toggleClickUpAssignee([ada], grace)).toEqual({
      removing: false,
      assignees: [ada, grace]
    })
    expect(toggleClickUpAssignee([ada, grace], ada)).toEqual({
      removing: true,
      assignees: [grace]
    })
  })
})
