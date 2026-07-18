import { beforeEach, describe, expect, it, vi } from 'vitest'

const clickUpRequestMock = vi.fn()

vi.mock('./client', () => ({
  acquire: vi.fn(),
  clearToken: vi.fn(),
  getClient: () => ({ workspaceId: 'workspace-1' }),
  isAuthError: () => false,
  release: vi.fn(),
  clickUpRequest: (...args: unknown[]) => clickUpRequestMock(...args)
}))

import { listViews, listViewTaskPage } from './views'

describe('ClickUp saved views', () => {
  beforeEach(() => clickUpRequestMock.mockReset())

  it('maps user and required list views', async () => {
    clickUpRequestMock.mockResolvedValue({
      views: [
        {
          id: 'view-1',
          name: 'My work',
          type: 'list',
          grouping: {
            field: 'status',
            dir: -1,
            collapsed: ['review']
          },
          sorting: {
            fields: [{ field: 'dateUpdated', dir: -1, idx: 0 }]
          },
          filters: { show_closed: false },
          columns: {
            fields: [
              { field: 'assignee', idx: 0, width: 160, hidden: false },
              { field: 'status', idx: 1, width: null, hidden: true }
            ]
          },
          settings: { show_subtasks: 3 }
        },
        { id: 'view-2', name: 'Duplicate', type: 'board' },
        { id: '', name: 'Invalid' }
      ],
      required_views: {
        board: [{ id: 'view-2', name: 'Everything', type: 'board' }]
      }
    })

    await expect(listViews('list-1', 'workspace-1')).resolves.toEqual({
      views: [
        {
          id: 'view-1',
          name: 'My work',
          type: 'list',
          required: false,
          configuration: {
            grouping: {
              field: 'status',
              direction: 'descending',
              collapsedValues: ['review']
            },
            sorting: [{ field: 'dateUpdated', direction: 'descending', index: 0 }],
            showClosedTasks: false,
            columns: [
              { field: 'assignee', hidden: false, index: 0, width: 160 },
              { field: 'status', hidden: true, index: 1, width: null }
            ],
            subtaskMode: 'separate'
          }
        }
      ],
      requiredViews: [{ id: 'view-2', name: 'Everything', type: 'board', required: true }]
    })
    expect(clickUpRequestMock.mock.calls[0]?.[1]).toBe('/list/list-1/view')
  })

  it.each([
    [1, 'collapsed'],
    [2, 'expanded'],
    [3, 'separate']
  ] as const)('maps ClickUp show_subtasks %s to %s', async (rawMode, subtaskMode) => {
    clickUpRequestMock.mockResolvedValue({
      views: [
        {
          id: `view-${rawMode}`,
          name: `Mode ${rawMode}`,
          type: 'list',
          settings: { show_subtasks: rawMode }
        }
      ]
    })

    const result = await listViews('list-1', 'workspace-1')

    expect(result.views[0]?.configuration?.subtaskMode).toBe(subtaskMode)
  })

  it('keeps the task membership returned by the saved view', async () => {
    clickUpRequestMock.mockResolvedValue({
      last_page: true,
      tasks: [
        {
          id: 'closed-task',
          name: 'Closed task',
          status: { status: 'closed', type: 'closed' }
        }
      ]
    })

    const result = await listViewTaskPage('view-1', 'list-1', 0, 'workspace-1')

    expect(result).toMatchObject({
      page: 0,
      hasMore: false,
      tasks: [{ id: 'closed-task', listId: 'list-1' }]
    })
    expect(clickUpRequestMock.mock.calls[0]?.[1]).toBe('/view/view-1/task?page=0')
  })
})
