import { describe, expect, it } from 'vitest'

import { getClickUpSavedViewLayout } from './clickup-saved-view-layout'

describe('ClickUp saved view layout', () => {
  it('maps supported ClickUp list configuration onto Orca controls', () => {
    expect(
      getClickUpSavedViewLayout({
        id: 'view-1',
        name: 'Tech Review',
        type: 'list',
        required: false,
        configuration: {
          grouping: {
            field: 'status',
            direction: 'descending',
            collapsedValues: ['Review']
          },
          sorting: [{ field: 'dateUpdated', direction: 'descending', index: 0 }],
          showClosedTasks: false,
          subtaskMode: 'separate',
          columns: [
            { field: 'assignee', hidden: false, index: 0, width: 160 },
            { field: 'priority', hidden: false, index: 1, width: 120 },
            { field: 'status', hidden: true, index: 2, width: 140 },
            { field: 'dateUpdated', hidden: false, index: 3, width: 180 }
          ]
        }
      })
    ).toEqual({
      grouping: 'status',
      groupDirection: 'descending',
      collapsedGroupIds: ['status:review'],
      subtaskMode: 'separate',
      ordering: 'updated',
      orderingDirection: 'descending',
      showClosedTasks: false,
      displayProperties: ['assignees', 'priority', 'updated'],
      columnWidths: { assignees: 160, priority: 120, updated: 180 }
    })
  })

  it('falls back to ungrouped layout for unsupported ClickUp grouping fields', () => {
    expect(
      getClickUpSavedViewLayout({
        id: 'view-2',
        name: 'Assignment',
        type: 'list',
        required: false,
        configuration: {
          grouping: {
            field: 'assignee',
            direction: 'ascending',
            collapsedValues: ['123']
          }
        }
      })
    ).toEqual({
      grouping: 'none',
      groupDirection: 'ascending',
      collapsedGroupIds: []
    })
  })

  it('leaves local controls untouched when ClickUp omits configuration', () => {
    expect(
      getClickUpSavedViewLayout({
        id: 'view-3',
        name: 'Legacy view',
        type: 'list',
        required: false
      })
    ).toEqual({})
  })
})
