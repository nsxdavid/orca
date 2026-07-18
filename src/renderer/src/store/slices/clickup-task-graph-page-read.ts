import { clickUpListTaskPage } from '@/runtime/runtime-clickup-client'
import { clickUpListViewTaskPage } from '@/runtime/runtime-clickup-views-client'
import type { RuntimeClickUpSettings } from '@/runtime/runtime-clickup-client'
import type { ClickUpTaskFilter, ClickUpTaskPage } from '../../../../shared/types'

export function readClickUpTaskGraphPage(args: {
  settings: RuntimeClickUpSettings
  viewId?: string | null
  listId: string
  filter: ClickUpTaskFilter
  page: number
  workspaceId?: string | null
}): Promise<ClickUpTaskPage> {
  if (args.viewId) {
    return clickUpListViewTaskPage(
      args.settings,
      args.viewId,
      args.listId,
      args.page,
      args.workspaceId
    )
  }
  return clickUpListTaskPage(
    args.settings,
    args.listId,
    args.filter,
    args.page,
    args.workspaceId,
    false
  )
}
