import type { ClickUpView } from '../../../shared/types'
import type {
  ClickUpGroupDirection,
  ClickUpGrouping,
  ClickUpSubtaskMode
} from './clickup-list-layout-controls'

export type ClickUpOrdering = 'updated' | 'priority' | 'identity'
export type ClickUpDisplayProperty =
  | 'type'
  | 'status'
  | 'priority'
  | 'tags'
  | 'assignees'
  | 'updated'

export const CLICKUP_DISPLAY_PROPERTIES: ClickUpDisplayProperty[] = [
  'type',
  'status',
  'priority',
  'tags',
  'assignees',
  'updated'
]

export type ClickUpSavedViewLayout = {
  grouping?: ClickUpGrouping
  groupDirection?: ClickUpGroupDirection
  collapsedGroupIds?: string[]
  subtaskMode?: ClickUpSubtaskMode
  ordering?: ClickUpOrdering
  orderingDirection?: ClickUpGroupDirection
  showClosedTasks?: boolean
  displayProperties?: ClickUpDisplayProperty[]
  columnWidths?: Partial<Record<ClickUpDisplayProperty, number>>
}

function normalizedField(field: string): string {
  return field.replaceAll('_', '').trim().toLowerCase()
}

function mapGrouping(field: string): ClickUpGrouping {
  switch (normalizedField(field)) {
    case 'status':
      return 'status'
    case 'priority':
      return 'priority'
    case 'type':
    case 'tasktype':
    case 'customitem':
    case 'customitems':
      return 'type'
    case 'tag':
    case 'tags':
      return 'tag'
    default:
      return 'none'
  }
}

function mapColumn(field: string): ClickUpDisplayProperty | undefined {
  switch (normalizedField(field)) {
    case 'type':
    case 'tasktype':
    case 'customitem':
    case 'customitems':
      return 'type'
    case 'status':
      return 'status'
    case 'priority':
      return 'priority'
    case 'tag':
    case 'tags':
      return 'tags'
    case 'assignee':
    case 'assignees':
      return 'assignees'
    case 'dateupdated':
      return 'updated'
    default:
      return undefined
  }
}

function mapOrdering(field: string): ClickUpOrdering | undefined {
  switch (normalizedField(field)) {
    case 'dateupdated':
      return 'updated'
    case 'priority':
      return 'priority'
    case 'id':
    case 'customid':
    case 'name':
      return 'identity'
    default:
      return undefined
  }
}

export function getClickUpSavedViewLayout(view: ClickUpView): ClickUpSavedViewLayout {
  const configuration = view.configuration
  if (!configuration) {
    return {}
  }
  const grouping = configuration.grouping ? mapGrouping(configuration.grouping.field) : undefined
  const columns = configuration.columns
  const visibleColumns = columns
    ?.filter((column) => !column.hidden)
    .sort((left, right) => (left.index ?? 0) - (right.index ?? 0))
  const displayProperties = visibleColumns
    ? [
        ...new Set(
          visibleColumns.flatMap((column) => {
            const property = mapColumn(column.field)
            return property ? [property] : []
          })
        )
      ]
    : undefined
  const columnWidths = visibleColumns?.reduce<Partial<Record<ClickUpDisplayProperty, number>>>(
    (widths, column) => {
      const property = mapColumn(column.field)
      if (property && typeof column.width === 'number' && column.width > 0) {
        widths[property] = column.width
      }
      return widths
    },
    {}
  )
  const sorting = configuration.sorting
    ?.map((field) => ({ ordering: mapOrdering(field.field), direction: field.direction }))
    .find((value) => value.ordering !== undefined)

  return {
    ...(grouping !== undefined ? { grouping } : {}),
    ...(configuration.grouping?.direction
      ? { groupDirection: configuration.grouping.direction }
      : {}),
    ...(grouping && grouping !== 'none'
      ? {
          collapsedGroupIds: configuration.grouping?.collapsedValues.map(
            (value) => `${grouping}:${value.toLocaleLowerCase()}`
          )
        }
      : { collapsedGroupIds: [] }),
    ...(configuration.subtaskMode ? { subtaskMode: configuration.subtaskMode } : {}),
    ...(sorting?.ordering ? { ordering: sorting.ordering } : {}),
    ...(sorting?.direction ? { orderingDirection: sorting.direction } : {}),
    ...(configuration.showClosedTasks !== undefined
      ? { showClosedTasks: configuration.showClosedTasks }
      : {}),
    ...(displayProperties ? { displayProperties } : {}),
    ...(columnWidths && Object.keys(columnWidths).length > 0 ? { columnWidths } : {})
  }
}
