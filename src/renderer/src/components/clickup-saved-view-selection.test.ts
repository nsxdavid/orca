import { describe, expect, it } from 'vitest'

import { getSelectableClickUpSavedViews } from './clickup-saved-view-selection'

describe('ClickUp saved view selection', () => {
  it('offers user-saved list views only', () => {
    expect(
      getSelectableClickUpSavedViews({
        requiredViews: [{ id: 'required', name: 'Required list', type: 'list', required: true }],
        views: [
          { id: 'list', name: 'My list', type: 'list', required: false },
          { id: 'board', name: 'My board', type: 'board', required: false },
          { id: 'gantt', name: 'My Gantt', type: 'gantt', required: false }
        ]
      })
    ).toEqual([{ id: 'list', name: 'My list', type: 'list', required: false }])
  })
})
