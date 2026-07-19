import { ListFilter, LoaderCircle } from 'lucide-react'
import type { JSX } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import type { ClickUpListViews, ClickUpView } from '../../../shared/types'
import { translate } from '@/i18n/i18n'
import { getSelectableClickUpSavedViews } from './clickup-saved-view-selection'

export const CLICKUP_ALL_TASKS_VIEW = 'all-tasks'

function ViewItems({ views }: { views: readonly ClickUpView[] }): JSX.Element {
  return (
    <>
      {views.map((view) => (
        <SelectItem key={view.id} value={view.id}>
          {view.name}
        </SelectItem>
      ))}
    </>
  )
}

export function ClickUpSavedViewSelect(props: {
  data: ClickUpListViews
  loading: boolean
  error: string | null
  value: string | null
  onChange: (viewId: string | null) => void
}): JSX.Element {
  const savedViews = getSelectableClickUpSavedViews(props.data)
  return (
    <Select
      value={props.value ?? CLICKUP_ALL_TASKS_VIEW}
      onValueChange={(value) => props.onChange(value === CLICKUP_ALL_TASKS_VIEW ? null : value)}
    >
      <SelectTrigger
        size="sm"
        className="w-[220px] border-border/50 bg-muted/50 text-xs font-medium shadow-sm"
        aria-label={translate(
          'auto.components.ClickUpSavedViewSelect.savedView',
          'ClickUp saved view'
        )}
        aria-invalid={props.error ? true : undefined}
        title={props.error ?? undefined}
      >
        {props.loading ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : (
          <ListFilter className="size-3.5" />
        )}
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" side="bottom" align="start" sideOffset={4}>
        <SelectItem value={CLICKUP_ALL_TASKS_VIEW}>
          {translate('auto.components.ClickUpSavedViewSelect.allTasks', 'All tasks')}
        </SelectItem>
        {savedViews.length > 0 ? (
          <>
            <SelectSeparator />
            <ViewItems views={savedViews} />
          </>
        ) : null}
      </SelectContent>
    </Select>
  )
}
