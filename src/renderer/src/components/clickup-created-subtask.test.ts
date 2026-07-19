import { describe, expect, it } from 'vitest'
import type { ClickUpTask } from '../../../shared/types'
import {
  preserveClickUpCreatedSubtaskPlacement,
  upsertClickUpCreatedSubtask
} from './clickup-created-subtask'
import { getClickUpTaskRows } from './clickup-task-tree'

const task = (id: string, parentId?: string, subtaskCount?: number): ClickUpTask => ({
  id,
  listId: 'list-1',
  title: id,
  url: `https://app.clickup.com/t/${id}`,
  parentId,
  subtaskCount,
  assignees: [],
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
})

describe('upsertClickUpCreatedSubtask', () => {
  it('inserts the child immediately and updates the parent metadata', () => {
    const result = upsertClickUpCreatedSubtask(
      [task('parent', undefined, 2)],
      'parent',
      task('new'),
      3
    )

    expect(result.map((entry) => entry.id)).toEqual(['parent', 'new'])
    expect(result[0]).toMatchObject({ hasSubtasks: true, subtaskCount: 3 })
    expect(result[1]?.parentId).toBe('parent')
  })

  it('restores the child after a stale branch response removes it', () => {
    const staleTasks = [task('parent', undefined, 2), task('existing', 'parent')]
    const result = upsertClickUpCreatedSubtask(staleTasks, 'parent', task('new'), 3)

    expect(result.map((entry) => entry.id)).toEqual(['parent', 'existing', 'new'])
    expect(result[0]?.subtaskCount).toBe(3)
  })

  it('is idempotent when hydration returns the created child again', () => {
    const current = [task('parent', undefined, 3), task('new', 'parent')]
    const result = upsertClickUpCreatedSubtask(current, 'parent', task('new', 'parent'), 3)

    expect(result.filter((entry) => entry.id === 'new')).toHaveLength(1)
    expect(result[0]?.subtaskCount).toBe(3)
  })

  it('keeps a newly created child at the end after updated ordering', () => {
    const ordered = [task('new', 'parent'), task('existing', 'parent'), task('parent')]
    const placed = preserveClickUpCreatedSubtaskPlacement(ordered, ['new'])
    const rows = getClickUpTaskRows(placed, new Set(['parent']), 'tree')

    expect(rows.flatMap((row) => row.task?.id ?? [])).toEqual(['parent', 'existing', 'new'])
  })

  it('preserves the creation order for multiple inline children', () => {
    const ordered = [task('second', 'parent'), task('first', 'parent'), task('parent')]

    expect(
      preserveClickUpCreatedSubtaskPlacement(ordered, ['first', 'second']).map((entry) => entry.id)
    ).toEqual(['parent', 'first', 'second'])
  })
})
