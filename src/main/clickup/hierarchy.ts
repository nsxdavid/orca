import type { ClickUpFolder, ClickUpList, ClickUpSpace, ClickUpTag } from '../../shared/types'
import type { ClickUpClient } from './client'
import { acquire, clickUpRequest, getClient, isAuthError, release, clearToken } from './client'
import { mapClickUpFolder, mapClickUpList, mapClickUpSpace, mapClickUpTag } from './mappers'

type SpacesResponse = { spaces?: unknown[] }
type FoldersResponse = { folders?: unknown[] }
type ListsResponse = { lists?: unknown[] }
type TagsResponse = { tags?: unknown[] }

function tagsFromResponse(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response
  }
  const record = response && typeof response === 'object' ? (response as TagsResponse) : {}
  return Array.isArray(record.tags) ? record.tags : []
}

function connectedClient(workspaceId?: string | null) {
  const client = getClient(workspaceId)
  if (!client) {
    throw new Error('Not connected to ClickUp.')
  }
  return client
}

async function enrichListsWithStatuses(
  client: ClickUpClient,
  lists: ClickUpList[]
): Promise<ClickUpList[]> {
  return Promise.all(
    lists.map(async (list) => {
      if (list.statuses?.length) {
        return list
      }
      try {
        // Why: list collection endpoints can omit workflow statuses; the detail endpoint
        // provides them for editable status chips.
        const detail = await clickUpRequest<unknown>(client, `/list/${encodeURIComponent(list.id)}`)
        return mapClickUpList(list.workspaceId, list.spaceId, list.folderId ?? null, detail) ?? list
      } catch {
        return list
      }
    })
  )
}

export async function listSpaces(workspaceId: string): Promise<ClickUpSpace[]> {
  const client = connectedClient(workspaceId)
  await acquire()
  try {
    const response = await clickUpRequest<SpacesResponse>(
      client,
      `/team/${encodeURIComponent(workspaceId)}/space?archived=false`
    )
    return (response.spaces ?? [])
      .map((space) => mapClickUpSpace(workspaceId, space))
      .filter((space): space is ClickUpSpace => !!space)
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
      throw error
    }
    throw error
  } finally {
    release()
  }
}

export async function listFolders(spaceId: string, workspaceId?: string): Promise<ClickUpFolder[]> {
  const client = connectedClient(workspaceId)
  await acquire()
  try {
    const response = await clickUpRequest<FoldersResponse>(
      client,
      `/space/${encodeURIComponent(spaceId)}/folder?archived=false`
    )
    return (response.folders ?? [])
      .map((folder) => mapClickUpFolder(workspaceId ?? client.workspaceId ?? '', spaceId, folder))
      .filter((folder): folder is ClickUpFolder => !!folder)
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
      throw error
    }
    throw error
  } finally {
    release()
  }
}

export async function listSpaceTags(spaceId: string, workspaceId?: string): Promise<ClickUpTag[]> {
  const client = connectedClient(workspaceId)
  await acquire()
  try {
    const response = await clickUpRequest<unknown>(
      client,
      `/space/${encodeURIComponent(spaceId)}/tag`
    )
    return tagsFromResponse(response)
      .map(mapClickUpTag)
      .filter((tag): tag is ClickUpTag => !!tag)
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
      throw error
    }
    throw error
  } finally {
    release()
  }
}

export async function listFolderlessLists(
  spaceId: string,
  workspaceId?: string
): Promise<ClickUpList[]> {
  const client = connectedClient(workspaceId)
  await acquire()
  try {
    const response = await clickUpRequest<ListsResponse>(
      client,
      `/space/${encodeURIComponent(spaceId)}/list?archived=false`
    )
    const lists = (response.lists ?? [])
      .map((list) => mapClickUpList(workspaceId ?? client.workspaceId ?? '', spaceId, null, list))
      .filter((list): list is ClickUpList => !!list)
    return enrichListsWithStatuses(client, lists)
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
      throw error
    }
    throw error
  } finally {
    release()
  }
}

export async function listFolderLists(
  folderId: string,
  spaceId: string,
  workspaceId?: string
): Promise<ClickUpList[]> {
  const client = connectedClient(workspaceId)
  await acquire()
  try {
    const response = await clickUpRequest<ListsResponse>(
      client,
      `/folder/${encodeURIComponent(folderId)}/list?archived=false`
    )
    const lists = (response.lists ?? [])
      .map((list) =>
        mapClickUpList(workspaceId ?? client.workspaceId ?? '', spaceId, folderId, list)
      )
      .filter((list): list is ClickUpList => !!list)
    return enrichListsWithStatuses(client, lists)
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
      throw error
    }
    throw error
  } finally {
    release()
  }
}
