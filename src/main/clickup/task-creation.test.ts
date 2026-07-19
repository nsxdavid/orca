import { beforeEach, describe, expect, it, vi } from 'vitest'

const clickUpRequestMock = vi.fn()

vi.mock('./client', () => ({
  clickUpRequest: (...args: unknown[]) => clickUpRequestMock(...args)
}))

import { buildClickUpCreateTaskPayload, createClickUpTaskRecord } from './task-creation'

const client = { token: 'token', workspaceId: 'workspace-1' }

describe('ClickUp task creation', () => {
  beforeEach(() => clickUpRequestMock.mockReset())

  it('includes the parent task in the create payload', () => {
    expect(
      buildClickUpCreateTaskPayload({
        listId: 'list-1',
        name: '  Child task  ',
        parentTaskId: 'parent-1',
        status: 'to do',
        priority: 2,
        customItemId: 7,
        assigneeIds: [42]
      })
    ).toEqual({
      name: 'Child task',
      parent: 'parent-1',
      description: undefined,
      status: 'to do',
      priority: 2,
      custom_item_id: 7,
      assignees: [42],
      due_date: undefined,
      start_date: undefined
    })
  })

  it('accepts the created task when ClickUp confirms the requested parent', async () => {
    clickUpRequestMock.mockResolvedValue({
      id: 'child-1',
      name: 'Child task',
      parent: 'parent-1'
    })

    await expect(
      createClickUpTaskRecord(client, {
        listId: 'list-1',
        name: 'Child task',
        parentTaskId: 'parent-1'
      })
    ).resolves.toMatchObject({ id: 'child-1', parentId: 'parent-1' })
    expect(clickUpRequestMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(clickUpRequestMock.mock.calls[0][2].body)).toMatchObject({
      parent: 'parent-1'
    })
  })

  it('repairs and verifies a created task when ClickUp omits its parent', async () => {
    clickUpRequestMock
      .mockResolvedValueOnce({ id: 'child-1', name: 'Child task', parent: null })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ id: 'child-1', name: 'Child task', parent: 'parent-1' })

    await expect(
      createClickUpTaskRecord(client, {
        listId: 'list-1',
        name: 'Child task',
        parentTaskId: 'parent-1'
      })
    ).resolves.toMatchObject({ id: 'child-1', parentId: 'parent-1' })
    expect(clickUpRequestMock.mock.calls[1].slice(1)).toEqual([
      '/task/child-1',
      { method: 'PUT', body: JSON.stringify({ parent: 'parent-1' }) }
    ])
    expect(clickUpRequestMock.mock.calls[2][1]).toBe('/task/child-1?include_subtasks=true')
  })

  it('does not report success when ClickUp still returns a root task after repair', async () => {
    clickUpRequestMock
      .mockResolvedValueOnce({ id: 'child-1', name: 'Child task', parent: null })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ id: 'child-1', name: 'Child task', parent: null })

    await expect(
      createClickUpTaskRecord(client, {
        listId: 'list-1',
        name: 'Child task',
        parentTaskId: 'parent-1'
      })
    ).rejects.toThrow('did not assign the requested parent task')
  })
})
