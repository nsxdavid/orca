import type { ClickUpTask } from '../../../shared/types'
import { getClickUpTaskWorkspaceName } from '../../../shared/workspace-name'

type ClickUpTaskWorkspaceNameInput = Pick<ClickUpTask, 'customId' | 'id' | 'title'>

export function getClickUpTaskIdentifier(task: Pick<ClickUpTask, 'customId' | 'id'>): string {
  return task.customId || `CU-${task.id}`
}

export function getClickUpTaskWorkspaceSeed(
  task: ClickUpTaskWorkspaceNameInput,
  username?: string | null
): string {
  // Why: ClickUp workspaces include the connected viewer suffix to match GitHub-style task naming.
  return getClickUpTaskWorkspaceName({
    identifier: getClickUpTaskIdentifier(task),
    title: task.title,
    username
  })
}
