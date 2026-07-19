import { beforeEach, describe, expect, it, vi } from 'vitest'

const clickUpRequestMock = vi.fn()

vi.mock('./client', () => ({
  clickUpRequest: (...args: unknown[]) => clickUpRequestMock(...args),
  isAuthError: () => false
}))

import { fetchTaskChildrenPage, fetchTaskListPage } from './task-list-pages'
import type { ClickUpClient } from './client'

const client = {} as ClickUpClient

describe('ClickUp task page loading', () => {
  beforeEach(() => clickUpRequestMock.mockReset())

  it('requests roots but preserves nested tasks ClickUp already returned', async () => {
    clickUpRequestMock.mockResolvedValue({
      tasks: [
        {
          id: 'parent',
          name: 'Parent',
          subtasks: [{ id: 'child', name: 'Child', parent: 'parent' }]
        }
      ]
    })

    const result = await fetchTaskListPage(client, 'list-1', 'open', 0, 'workspace-1', false)

    expect(result.tasks.map(({ id }) => id)).toEqual(['parent', 'child'])
    expect(result.tasks[0]).toMatchObject({ hasSubtasks: true, subtaskCount: 1 })
    expect(result.completeParentIds).toEqual(['parent'])
    expect(clickUpRequestMock.mock.calls[0]?.[1]).toContain('subtasks=false')
    expect(clickUpRequestMock.mock.calls[0]?.[1]).toContain('include_timl=true')
    expect(clickUpRequestMock.mock.calls[0]?.[1]).not.toContain('include_markdown_description')
  })

  it('leaves child presence unresolved only when ClickUp omits the metadata', async () => {
    clickUpRequestMock.mockResolvedValue({ tasks: [{ id: 'task', name: 'Task' }] })

    const result = await fetchTaskListPage(client, 'list-1', 'open', 0, 'workspace-1', false)

    expect(result.tasks[0]?.hasSubtasks).toBeUndefined()
    expect(result.tasks[0]?.subtaskCount).toBeUndefined()
  })

  it('does not mark a partial embedded subtask array as a complete branch', async () => {
    clickUpRequestMock.mockResolvedValue({
      tasks: [
        {
          id: 'parent',
          name: 'Parent',
          subtask_count: 2,
          subtasks: [{ id: 'child', name: 'Child', parent: 'parent' }]
        }
      ]
    })

    const result = await fetchTaskListPage(client, 'list-1', 'open', 0, 'workspace-1', false)

    expect(result.completeParentIds).toEqual([])
    expect(result.tasks.map(({ id }) => id)).toEqual(['parent', 'child'])
  })

  it('loads one task branch and preserves nested descendants', async () => {
    clickUpRequestMock.mockResolvedValue({
      id: 'parent',
      name: 'Parent',
      subtasks: [
        {
          id: 'child',
          name: 'Child',
          parent: 'parent',
          subtasks: [{ id: 'grandchild', name: 'Grandchild', parent: 'child' }]
        }
      ]
    })

    const result = await fetchTaskChildrenPage(client, 'parent', 'list-1', 'open', 0, 'workspace-1')

    expect(result.tasks.map(({ id }) => id)).toEqual(['child'])
    expect(result.discoveredTasks?.map(({ id }) => id)).toEqual(['child', 'grandchild'])
    expect(result.completeParentIds).toEqual(['parent', 'child'])
    expect(result.hasMore).toBe(false)
    expect(clickUpRequestMock.mock.calls[0]?.[1]).toBe('/task/parent?include_subtasks=true')
  })

  it('filters closed direct children unless they are requested', async () => {
    const tasks = [
      { id: 'open-child', name: 'Open child', parent: 'parent' },
      {
        id: 'closed-child',
        name: 'Closed child',
        parent: 'parent',
        status: { status: 'closed', type: 'closed' }
      }
    ]
    clickUpRequestMock.mockResolvedValue({ id: 'parent', name: 'Parent', subtasks: tasks })

    await expect(
      fetchTaskChildrenPage(client, 'parent', 'list-1', 'open', 0, 'workspace-1')
    ).resolves.toMatchObject({ tasks: [{ id: 'open-child' }] })
    await expect(
      fetchTaskChildrenPage(client, 'parent', 'list-1', 'all', 0, 'workspace-1')
    ).resolves.toMatchObject({ tasks: [{ id: 'open-child' }, { id: 'closed-child' }] })
  })

  it('resolves a large direct branch with one bounded task read', async () => {
    clickUpRequestMock.mockResolvedValue({
      id: 'parent',
      name: 'Parent',
      subtasks: Array.from({ length: 100 }, (_, index) => ({
        id: `child-${index}`,
        name: `Child ${index}`,
        parent: 'parent'
      }))
    })

    const result = await fetchTaskChildrenPage(client, 'parent', 'list-1', 'open', 0, 'workspace-1')

    expect(result.tasks).toHaveLength(100)
    expect(result.hasMore).toBe(false)
    expect(clickUpRequestMock).toHaveBeenCalledTimes(1)
  })

  it('does not repeat a direct task read for later pages', async () => {
    await expect(
      fetchTaskChildrenPage(client, 'parent', 'list-1', 'open', 1, 'workspace-1')
    ).resolves.toMatchObject({ tasks: [], discoveredTasks: [], page: 1, hasMore: false })
    expect(clickUpRequestMock).not.toHaveBeenCalled()
  })
})
