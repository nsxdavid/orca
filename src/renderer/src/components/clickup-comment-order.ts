import type { ClickUpComment } from '../../../shared/types'

export function orderClickUpCommentsOldestFirst(
  comments: readonly ClickUpComment[]
): ClickUpComment[] {
  return comments.toSorted((left, right) => {
    const dateDelta = Date.parse(left.createdAt) - Date.parse(right.createdAt)
    return dateDelta || left.id.localeCompare(right.id)
  })
}
