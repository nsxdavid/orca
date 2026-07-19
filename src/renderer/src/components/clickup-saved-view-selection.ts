import type { ClickUpListViews, ClickUpView } from '../../../shared/types'

export function getSelectableClickUpSavedViews(data: ClickUpListViews): ClickUpView[] {
  return data.views.filter((view) => view.type.trim().toLowerCase() === 'list')
}
