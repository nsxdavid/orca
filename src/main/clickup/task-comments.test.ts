import { beforeEach, describe, expect, it, vi } from 'vitest'

const clientMocks = vi.hoisted(() => ({
  acquire: vi.fn(() => Promise.resolve()),
  clearToken: vi.fn(),
  clickUpRequest: vi.fn(),
  isAuthError: vi.fn(() => false),
  release: vi.fn()
}))

vi.mock('./client', () => ({
  acquire: clientMocks.acquire,
  clearToken: clientMocks.clearToken,
  clickUpRequest: (...args: unknown[]) => clientMocks.clickUpRequest(...args),
  getClient: () => ({ token: 'token', workspaceId: 'workspace-1' }),
  isAuthError: clientMocks.isAuthError,
  release: clientMocks.release
}))

import { getCommentReplies, getTaskComments } from './task-comments'

describe('ClickUp comment reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clientMocks.isAuthError.mockReturnValue(false)
  })

  it('propagates task comment read failures', async () => {
    clientMocks.clickUpRequest.mockRejectedValueOnce(new Error('ClickUp is unavailable'))

    await expect(getTaskComments('task-1', 'workspace-1')).rejects.toThrow('ClickUp is unavailable')
    expect(clientMocks.clearToken).not.toHaveBeenCalled()
    expect(clientMocks.release).toHaveBeenCalledOnce()
  })

  it('propagates comment reply read failures', async () => {
    clientMocks.clickUpRequest.mockRejectedValueOnce(new Error('Rate limited'))

    await expect(getCommentReplies('comment-1', 'workspace-1')).rejects.toThrow('Rate limited')
    expect(clientMocks.clearToken).not.toHaveBeenCalled()
    expect(clientMocks.release).toHaveBeenCalledOnce()
  })
})
