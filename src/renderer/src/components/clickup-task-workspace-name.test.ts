import { describe, expect, it } from 'vitest'
import {
  getClickUpTaskIdentifier,
  getClickUpTaskWorkspaceSeed
} from './clickup-task-workspace-name'

describe('ClickUp task workspace names', () => {
  it('includes the connected viewer in the workspace seed', () => {
    const task = {
      id: '86aja1wk3',
      customId: 'CU-86aja1wk3',
      title: 'Improve board breadcrumbs'
    }

    expect(getClickUpTaskIdentifier(task)).toBe('CU-86aja1wk3')
    expect(getClickUpTaskWorkspaceSeed(task, 'David Whatley')).toBe(
      'CU-86aja1wk3_Improve-board-breadcrumbs_David-Whatley'
    )
  })

  it('falls back to the ClickUp task id when no custom id exists', () => {
    expect(
      getClickUpTaskWorkspaceSeed(
        { id: '86abc123', customId: null, title: 'Fix folder workspace hydration' },
        'David Whatley'
      )
    ).toBe('CU-86abc123_Fix-folder-workspace-hydration_David-Whatley')
  })
})
