import type { ClickUpComment } from '../../shared/types'
import { acquire, clearToken, clickUpRequest, getClient, isAuthError, release } from './client'
import { asRecord, asString, mapClickUpComment } from './mappers'

type CommentsResponse = { comments?: unknown[] }
type CommentMutationResult = { ok: true; id: string } | { ok: false; error: string }

function sortCommentsChronologically(comments: ClickUpComment[]): ClickUpComment[] {
  return comments.toSorted(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  )
}

function connectedClient(workspaceId?: string | null) {
  const client = getClient(workspaceId)
  if (!client) {
    throw new Error('Not connected to ClickUp.')
  }
  return client
}

export async function getTaskComments(
  taskId: string,
  workspaceId?: string | null
): Promise<ClickUpComment[]> {
  const client = connectedClient(workspaceId)
  await acquire()
  try {
    const comments: unknown[] = []
    const seenCommentIds = new Set<string>()
    const seenCursors = new Set<string>()
    let start: string | null = null
    let startId: string | null = null

    while (true) {
      const params = new URLSearchParams()
      if (start && startId) {
        params.set('start', start)
        params.set('start_id', startId)
      }
      const query = params.size > 0 ? `?${params.toString()}` : ''
      const response = await clickUpRequest<CommentsResponse>(
        client,
        `/task/${encodeURIComponent(taskId)}/comment${query}`
      )
      const page = response.comments ?? []
      if (page.length === 0) {
        break
      }
      for (const rawComment of page) {
        const id = asString(asRecord(rawComment).id)
        if (!id || seenCommentIds.has(id)) {
          continue
        }
        seenCommentIds.add(id)
        comments.push(rawComment)
      }
      const lastComment = asRecord(page.at(-1))
      const nextStart = asString(lastComment.date)
      const nextStartId = asString(lastComment.id)
      const cursor = `${nextStart}:${nextStartId}`
      if (!nextStart || !nextStartId || seenCursors.has(cursor)) {
        break
      }
      seenCursors.add(cursor)
      start = nextStart
      startId = nextStartId
    }

    return sortCommentsChronologically(comments.map(mapClickUpComment))
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
    }
    throw error
  } finally {
    release()
  }
}

async function addComment(
  path: string,
  body: string,
  workspaceId?: string | null
): Promise<CommentMutationResult> {
  const client = connectedClient(workspaceId)
  await acquire()
  try {
    const comment = await clickUpRequest<{ id?: string }>(client, path, {
      method: 'POST',
      body: JSON.stringify({ comment_text: body, notify_all: false })
    })
    return { ok: true, id: comment.id ?? '' }
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
      throw error
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to add ClickUp comment.'
    }
  } finally {
    release()
  }
}

export function addTaskComment(
  taskId: string,
  body: string,
  workspaceId?: string | null
): Promise<CommentMutationResult> {
  return addComment(`/task/${encodeURIComponent(taskId)}/comment`, body, workspaceId)
}

export async function getCommentReplies(
  commentId: string,
  workspaceId?: string | null
): Promise<ClickUpComment[]> {
  const client = connectedClient(workspaceId)
  await acquire()
  try {
    const response = await clickUpRequest<CommentsResponse>(
      client,
      `/comment/${encodeURIComponent(commentId)}/reply`
    )
    return sortCommentsChronologically((response.comments ?? []).map(mapClickUpComment))
  } catch (error) {
    if (isAuthError(error)) {
      clearToken()
    }
    throw error
  } finally {
    release()
  }
}

export function addCommentReply(
  commentId: string,
  body: string,
  workspaceId?: string | null
): Promise<CommentMutationResult> {
  return addComment(`/comment/${encodeURIComponent(commentId)}/reply`, body, workspaceId)
}
