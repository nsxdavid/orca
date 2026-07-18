import type { ClickUpUser } from '../../../shared/types'

export function getClickUpAssigneeCandidates(
  members: readonly ClickUpUser[],
  currentAssignees: readonly ClickUpUser[]
): ClickUpUser[] {
  const byId = new Map(members.map((member) => [member.id, member]))
  for (const assignee of currentAssignees) {
    byId.set(assignee.id, { ...byId.get(assignee.id), ...assignee })
  }
  return [...byId.values()]
}

export function toggleClickUpAssignee(
  currentAssignees: readonly ClickUpUser[],
  member: ClickUpUser
): { assignees: ClickUpUser[]; removing: boolean } {
  const removing = currentAssignees.some((assignee) => assignee.id === member.id)
  return {
    removing,
    assignees: removing
      ? currentAssignees.filter((assignee) => assignee.id !== member.id)
      : [...currentAssignees, member]
  }
}
