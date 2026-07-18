import { describe, expect, it } from 'vitest'

import type { ClickUpTask } from '../../../shared/types'
import { completeClickUpChildDiscovery } from './clickup-child-discovery'

function task(id: string, parentId: string | null = null): ClickUpTask {
  return {
    id,
    listId: 'list-1',
    parentId,
    title: id,
    url: `https://app.clickup.com/t/${id}`,
    assignees: [],
    tags: [],
    createdAt: '2026-07-12T00:00:00.000Z',
    updatedAt: '2026-07-12T00:00:00.000Z'
  }
}

describe('completeClickUpChildDiscovery', () => {
  it('commits child presence, count, and rows in one result', () => {
    const result = completeClickUpChildDiscovery([task('parent')], 'parent', [
      task('child-1', 'parent'),
      task('child-2', 'parent')
    ])

    expect(result[0]).toMatchObject({ id: 'parent', hasSubtasks: true, subtaskCount: 2 })
    expect(result.map(({ id }) => id)).toEqual(['parent', 'child-1', 'child-2'])
  })

  it('marks a confirmed leaf with a zero count', () => {
    expect(completeClickUpChildDiscovery([task('leaf')], 'leaf', [])[0]).toMatchObject({
      hasSubtasks: false,
      subtaskCount: 0
    })
  })

  it('keeps descendants included in the same ClickUp response', () => {
    const child = { ...task('child', 'parent'), hasSubtasks: true, subtaskCount: 1 }
    const grandchild = { ...task('grandchild', 'child'), hasSubtasks: false, subtaskCount: 0 }
    const result = completeClickUpChildDiscovery(
      [task('parent')],
      'parent',
      [child],
      [child, grandchild]
    )

    expect(result.map(({ id }) => id)).toEqual(['parent', 'child', 'grandchild'])
    expect(result[1]).toMatchObject({ hasSubtasks: true, subtaskCount: 1 })
  })
})
