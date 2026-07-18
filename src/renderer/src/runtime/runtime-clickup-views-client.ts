import type { ClickUpListViews, ClickUpTaskPage } from '../../../shared/types'
import { callRuntimeRpc } from './runtime-rpc-client'
import { getClickUpRuntimeTarget, type RuntimeClickUpSettings } from './runtime-clickup-client'

export async function clickUpListViews(
  settings: RuntimeClickUpSettings,
  listId: string,
  workspaceId?: string | null
): Promise<ClickUpListViews> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { listId, workspaceId: workspaceId ?? undefined }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpListViews>(target, 'clickup.listViews', args, { timeoutMs: 30_000 })
    : window.api.clickup.listViews(args)
}

export async function clickUpListViewTaskPage(
  settings: RuntimeClickUpSettings,
  viewId: string,
  listId: string,
  page: number,
  workspaceId?: string | null
): Promise<ClickUpTaskPage> {
  const target = getClickUpRuntimeTarget(settings)
  const args = { viewId, listId, page, workspaceId: workspaceId ?? undefined }
  return target.kind === 'environment'
    ? callRuntimeRpc<ClickUpTaskPage>(target, 'clickup.listViewTaskPage', args, {
        timeoutMs: 75_000
      })
    : window.api.clickup.listViewTaskPage(args)
}
