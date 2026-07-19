import type { ClickUpComment } from '../../../shared/types'
import { callRuntimeRpc } from './runtime-rpc-client'
import { getClickUpRuntimeTarget, type RuntimeClickUpSettings } from './runtime-clickup-client'

export type ClickUpCommentResult = { ok: true; id: string } | { ok: false; error: string }

export async function clickUpAddTaskComment(
  settings: RuntimeClickUpSettings,
  taskId: string,
  body: string,
  workspaceId?: string | null
): Promise<ClickUpCommentResult> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { taskId, body, workspaceId: workspaceId ?? undefined }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpCommentResult>(target, 'clickup.addTaskComment', args, {
        timeoutMs: 30_000
      })
    : window.api.clickup.addTaskComment(args)
}

export async function clickUpTaskComments(
  settings: RuntimeClickUpSettings,
  taskId: string,
  workspaceId?: string | null
): Promise<ClickUpComment[]> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { taskId, workspaceId: workspaceId ?? undefined }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpComment[]>(target, 'clickup.taskComments', args, { timeoutMs: 30_000 })
    : window.api.clickup.taskComments(args)
}

export async function clickUpAddCommentReply(
  settings: RuntimeClickUpSettings,
  commentId: string,
  body: string,
  workspaceId?: string | null
): Promise<ClickUpCommentResult> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { commentId, body, workspaceId: workspaceId ?? undefined }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpCommentResult>(target, 'clickup.addCommentReply', args, {
        timeoutMs: 30_000
      })
    : window.api.clickup.addCommentReply(args)
}

export async function clickUpCommentReplies(
  settings: RuntimeClickUpSettings,
  commentId: string,
  workspaceId?: string | null
): Promise<ClickUpComment[]> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { commentId, workspaceId: workspaceId ?? undefined }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpComment[]>(target, 'clickup.commentReplies', args, {
        timeoutMs: 30_000
      })
    : window.api.clickup.commentReplies(args)
}
