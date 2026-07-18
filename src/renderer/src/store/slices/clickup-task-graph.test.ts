import { describe, expect, it } from 'vitest'
import type { ClickUpTask } from '../../../../shared/types'
import {
  completeClickUpTaskBranch,
  completeClickUpTaskRootSnapshot,
  createEmptyClickUpTaskGraph,
  mergeClickUpTaskGraphTasks
} from './clickup-task-graph'

function task(id: string, parentId: string | null = null): ClickUpTask {
  return {
    id,
    listId: 'list-1',
    parentId,
    title: id,
    url: `https://app.clickup.com/t/${id}`,
    assignees: [],
    tags: [],
    createdAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:00:00.000Z'
  }
}

describe('ClickUp task graph', () => {
  it('prunes stale roots without discarding a retained completed branch', () => {
    const graph = mergeClickUpTaskGraphTasks(
      createEmptyClickUpTaskGraph(),
      [
        task('current-root'),
        task('current-child', 'current-root'),
        task('stale-root'),
        task('stale-child', 'stale-root')
      ],
      ['current-root', 'stale-root']
    )

    const result = completeClickUpTaskRootSnapshot(graph, new Set(['current-root']))

    expect(result.taskOrder).toEqual(['current-root', 'current-child'])
    expect(result.tasksById['stale-root']).toBeUndefined()
    expect(result.tasksById['stale-child']).toBeUndefined()
    expect(result.childrenStateByParent['current-root']).toEqual({
      ids: ['current-child'],
      status: 'complete',
      totalHint: 1
    })
  })

  it('replaces an authoritative branch without leaving stale descendants behind', () => {
    const parent = { ...task('parent'), hasSubtasks: true, subtaskCount: 1 }
    const graph = mergeClickUpTaskGraphTasks(createEmptyClickUpTaskGraph(), [
      parent,
      task('old-child', 'parent'),
      task('old-grandchild', 'old-child')
    ])
    const child = task('new-child', 'parent')

    const result = completeClickUpTaskBranch(graph, 'parent', [child], [child])

    expect(result.taskOrder).toEqual(['parent', 'new-child'])
    expect(result.childrenStateByParent.parent).toEqual({
      ids: ['new-child'],
      status: 'complete',
      totalHint: 1
    })
  })

  it('preserves completed branch knowledge when unrelated tasks merge', () => {
    const completed = mergeClickUpTaskGraphTasks(
      createEmptyClickUpTaskGraph(),
      [task('parent'), task('child', 'parent')],
      ['parent']
    )

    const result = mergeClickUpTaskGraphTasks(completed, [task('other')])

    expect(result.childrenStateByParent.parent).toEqual({
      ids: ['child'],
      status: 'complete',
      totalHint: 1
    })
    expect(result.tasksById.parent).toMatchObject({ hasSubtasks: true, subtaskCount: 1 })
  })

  it('publishes a progressive child count as soon as descendant rows arrive', () => {
    const graph = mergeClickUpTaskGraphTasks(createEmptyClickUpTaskGraph(), [
      task('parent'),
      task('first', 'parent'),
      task('second', 'parent')
    ])

    expect(graph.tasksById.parent).toMatchObject({ hasSubtasks: true, subtaskCount: 2 })
    expect(graph.childrenStateByParent.parent).toMatchObject({
      ids: ['first', 'second'],
      status: 'idle',
      totalHint: 2
    })
  })
})
