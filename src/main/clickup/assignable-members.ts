import type { ClickUpUser } from '../../shared/types'
import { acquire, clickUpRequest, clearToken, getClient, isAuthError, release } from './client'
import { asRecord, asString, mapClickUpUser } from './mappers'

type MembersResponse = { members?: unknown[] }
type WorkspacesResponse = { teams?: unknown[] }

function memberUsers(values: readonly unknown[]): ClickUpUser[] {
  return values
    .map((value) => {
      const member = asRecord(value)
      return mapClickUpUser(member.user ?? value)
    })
    .filter((user): user is ClickUpUser => user !== undefined)
}

export async function listAssignableMembers(
  listId: string,
  workspaceId?: string | null
): Promise<ClickUpUser[]> {
  const client = getClient(workspaceId)
  if (!client) {
    throw new Error('Not connected to ClickUp.')
  }
  const resolvedWorkspaceId = workspaceId ?? client.workspaceId ?? undefined
  await acquire()
  try {
    const [listResult, workspaceResult] = await Promise.allSettled([
      clickUpRequest<MembersResponse>(client, `/list/${encodeURIComponent(listId)}/member`),
      clickUpRequest<WorkspacesResponse>(client, '/team')
    ])
    if (listResult.status === 'rejected' && workspaceResult.status === 'rejected') {
      throw listResult.reason
    }

    const users = new Map<string, ClickUpUser>()
    const listMembers = listResult.status === 'fulfilled' ? (listResult.value.members ?? []) : []
    for (const user of memberUsers(listMembers)) {
      users.set(user.id, user)
    }

    const workspaces =
      workspaceResult.status === 'fulfilled' ? (workspaceResult.value.teams ?? []) : []
    const workspace = workspaces
      .map(asRecord)
      .find((team) => asString(team.id) === resolvedWorkspaceId)
    const workspaceMembers = Array.isArray(workspace?.members) ? workspace.members : []
    for (const user of memberUsers(workspaceMembers)) {
      const existing = users.get(user.id)
      users.set(user.id, {
        ...existing,
        ...user,
        email: user.email ?? existing?.email ?? null,
        avatarUrl: user.avatarUrl ?? existing?.avatarUrl
      })
    }
    return [...users.values()].sort((left, right) =>
      left.username.localeCompare(right.username, undefined, { sensitivity: 'base' })
    )
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
    }
    throw error
  } finally {
    release()
  }
}
