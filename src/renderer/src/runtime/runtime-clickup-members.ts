import type { ClickUpUser } from '../../../shared/types'
import { getClickUpRuntimeTarget, type RuntimeClickUpSettings } from './runtime-clickup-client'
import { callRuntimeRpc } from './runtime-rpc-client'

export async function clickUpListAssignableMembers(
  settings: RuntimeClickUpSettings,
  listId: string,
  workspaceId?: string | null
): Promise<ClickUpUser[]> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { listId, workspaceId: workspaceId ?? undefined }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpUser[]>(target, 'clickup.listAssignableMembers', args, {
        timeoutMs: 30_000
      })
    : window.api.clickup.listAssignableMembers(args)
}
