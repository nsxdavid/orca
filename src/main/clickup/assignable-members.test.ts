import { beforeEach, describe, expect, it, vi } from 'vitest'

const clickUpRequestMock = vi.fn()

vi.mock('./client', () => ({
  acquire: vi.fn(),
  release: vi.fn(),
  clearToken: vi.fn(),
  isAuthError: vi.fn(() => false),
  getClient: vi.fn(() => ({ token: 'token', workspaceId: 'workspace-1' })),
  clickUpRequest: (...args: unknown[]) => clickUpRequestMock(...args)
}))

import { listAssignableMembers } from './assignable-members'

describe('listAssignableMembers', () => {
  beforeEach(() => clickUpRequestMock.mockReset())

  it('combines list and workspace members without duplicate users', async () => {
    clickUpRequestMock
      .mockResolvedValueOnce({ members: [{ id: 1, username: 'Ada', email: 'ada@example.com' }] })
      .mockResolvedValueOnce({
        teams: [
          {
            id: 'workspace-1',
            members: [
              { user: { id: 1, username: 'Ada Lovelace', profilePicture: 'ada.png' } },
              { user: { id: 2, username: 'Grace' } }
            ]
          }
        ]
      })

    await expect(listAssignableMembers('list-1', 'workspace-1')).resolves.toEqual([
      {
        id: '1',
        username: 'Ada Lovelace',
        email: 'ada@example.com',
        avatarUrl: 'ada.png'
      },
      { id: '2', username: 'Grace', email: null, avatarUrl: undefined }
    ])
  })
})
