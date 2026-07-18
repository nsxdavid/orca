import { describe, expect, it } from 'vitest'

import {
  canExpandClickUpTask,
  filterClickUpTasksByClosedVisibility,
  getClickUpExpandedTaskIdsNeedingChildLoad,
  getClickUpExpandableTaskIds,
  getClickUpGroupedTaskRows,
  getClickUpTaskRows,
  isClickUpTaskChildMetadataPending,
  shouldLoadClickUpTaskChildren
} from './clickup-task-tree'
import type { ClickUpTask } from '../../../shared/types'

function task(id: string, parentId: string | null = null): ClickUpTask {
  return {
    id,
    listId: 'list-1',
    parentId,
    title: id,
    url: `https://app.clickup.com/t/${id}`,
    assignees: [],
    tags: [],
    createdAt: '2026-07-12T00:00:00.000Z',
    updatedAt: '2026-07-12T00:00:00.000Z'
  }
}

function closedTask(id: string, parentId: string | null = null): ClickUpTask {
  return { ...task(id, parentId), status: { status: 'closed', type: 'closed' } }
}

describe('getClickUpExpandedTaskIdsNeedingChildLoad', () => {
  const tasks = [
    { ...task('expanded-parent'), hasSubtasks: true },
    { ...task('collapsed-parent'), hasSubtasks: true },
    task('unknown-parent'),
    { ...task('leaf'), hasSubtasks: false }
  ]

  it('loads only expanded unresolved branches, including restored unknown parents', () => {
    expect(
      getClickUpExpandedTaskIdsNeedingChildLoad(
        tasks,
        new Set(['expanded-parent', 'unknown-parent', 'leaf']),
        new Set(),
        new Set(),
        new Set()
      )
    ).toEqual(['expanded-parent', 'unknown-parent'])
  })

  it('does not restart loading, failed, or hydrated branches', () => {
    expect(
      getClickUpExpandedTaskIdsNeedingChildLoad(
        tasks,
        new Set(['expanded-parent', 'unknown-parent']),
        new Set(['expanded-parent']),
        new Set(['unknown-parent']),
        new Set()
      )
    ).toEqual([])
  })
})

describe('getClickUpTaskRows', () => {
  const tasks = [task('parent'), task('child', 'parent')]

  it('renders roots only when the tree starts collapsed', () => {
    expect(getClickUpTaskRows(tasks, new Set(), 'tree')).toEqual([
      { task: tasks[0], depth: 0, hasChildren: true, expanded: false }
    ])
  })

  it('renders descendants only after their parent is explicitly expanded', () => {
    expect(getClickUpTaskRows(tasks, new Set(['parent']), 'tree')).toEqual([
      { task: tasks[0], depth: 0, hasChildren: true, expanded: true },
      { task: tasks[1], depth: 1, hasChildren: false, expanded: false }
    ])
  })

  it('shows an expansion control before a lazy parent has loaded its children', () => {
    const parent = { ...task('parent'), hasSubtasks: true }

    expect(getClickUpTaskRows([parent], new Set(), 'tree')).toEqual([
      { task: parent, depth: 0, hasChildren: true, expanded: false }
    ])
  })

  it('adds a loading row beneath an expanded branch while its children are pending', () => {
    const parent = { ...task('parent'), hasSubtasks: true, subtaskCount: 2 }

    expect(getClickUpTaskRows([parent], new Set(['parent']), 'tree', new Set(['parent']))).toEqual([
      { task: parent, depth: 0, hasChildren: true, expanded: true },
      {
        task: null,
        depth: 1,
        hasChildren: false,
        expanded: false,
        loadingParentId: 'parent'
      }
    ])
  })

  it('places a subtask composer after the existing children of its expanded parent', () => {
    expect(getClickUpTaskRows(tasks, new Set(['parent']), 'tree', new Set(), 'parent')).toEqual([
      { task: tasks[0], depth: 0, hasChildren: true, expanded: true },
      { task: tasks[1], depth: 1, hasChildren: false, expanded: false },
      {
        task: null,
        depth: 1,
        hasChildren: false,
        expanded: false,
        composerParentId: 'parent'
      }
    ])
  })

  it('places a subtask composer after the complete visible descendant branch', () => {
    const nestedTasks = [...tasks, task('grandchild', 'child')]

    expect(
      getClickUpTaskRows(nestedTasks, new Set(['parent', 'child']), 'tree', new Set(), 'parent')
    ).toEqual([
      { task: nestedTasks[0], depth: 0, hasChildren: true, expanded: true },
      { task: nestedTasks[1], depth: 1, hasChildren: true, expanded: true },
      { task: nestedTasks[2], depth: 2, hasChildren: false, expanded: false },
      {
        task: null,
        depth: 1,
        hasChildren: false,
        expanded: false,
        composerParentId: 'parent'
      }
    ])
  })

  it('places a subtask composer after a pending-child loading row', () => {
    const parent = { ...task('parent'), hasSubtasks: true, subtaskCount: 2 }

    expect(
      getClickUpTaskRows([parent], new Set(['parent']), 'tree', new Set(['parent']), 'parent')
    ).toEqual([
      { task: parent, depth: 0, hasChildren: true, expanded: true },
      {
        task: null,
        depth: 1,
        hasChildren: false,
        expanded: false,
        loadingParentId: 'parent'
      },
      {
        task: null,
        depth: 1,
        hasChildren: false,
        expanded: false,
        composerParentId: 'parent'
      }
    ])
  })

  it('places a subtask composer beneath a task in flat mode', () => {
    expect(getClickUpTaskRows([tasks[0]], new Set(), 'flat', new Set(), 'parent')).toEqual([
      { task: tasks[0], depth: 0, hasChildren: false, expanded: false },
      {
        task: null,
        depth: 1,
        hasChildren: false,
        expanded: false,
        composerParentId: 'parent'
      }
    ])
  })

  it('does not guess that a task has children while child discovery is unresolved', () => {
    const unresolved = task('unresolved')

    expect(getClickUpTaskRows([unresolved], new Set(), 'tree')).toEqual([
      { task: unresolved, depth: 0, hasChildren: false, expanded: false }
    ])
  })

  it('ignores unfiltered subtask metadata for a saved-view projection', () => {
    const parent = { ...task('parent'), hasSubtasks: true, subtaskCount: 4 }

    expect(getClickUpTaskRows([parent], new Set(), 'tree', new Set(), undefined, false)).toEqual([
      { task: parent, depth: 0, hasChildren: false, expanded: false }
    ])
  })
})

describe('getClickUpExpandableTaskIds', () => {
  it('includes parents known through relations or ClickUp subtask metadata', () => {
    expect([
      ...getClickUpExpandableTaskIds([
        task('parent'),
        task('child', 'parent'),
        {
          ...task('lazy-parent'),
          hasSubtasks: true
        }
      ])
    ]).toEqual(['parent', 'lazy-parent'])
  })

  it('ignores unfiltered subtask metadata for a saved-view projection', () => {
    expect([
      ...getClickUpExpandableTaskIds([{ ...task('lazy-parent'), hasSubtasks: true }], false)
    ]).toEqual([])
  })
})

describe('getClickUpGroupedTaskRows', () => {
  const groupByStatus = (item: ClickUpTask) => ({
    id: item.status?.status ?? 'no-status',
    label: item.status?.status ?? 'No status'
  })

  it('keeps nested subtasks inside their root task group', () => {
    const parent = { ...task('parent'), status: { status: 'review' } }
    const child = { ...task('child', 'parent'), status: { status: 'done' } }
    const otherRoot = { ...task('other-root'), status: { status: 'tech review' } }
    const rows = getClickUpTaskRows([parent, child, otherRoot], new Set(['parent']), 'tree')

    expect(
      getClickUpGroupedTaskRows(rows, groupByStatus).map((row) =>
        row.group ? `group:${row.group.id}:${row.group.count}` : row.task?.id
      )
    ).toEqual(['group:review:1', 'parent', 'child', 'group:tech review:1', 'other-root'])
  })

  it('groups subtasks independently when they are separate rows', () => {
    const child = { ...task('child', 'parent'), status: { status: 'done' } }
    const parent = { ...task('parent'), status: { status: 'review' } }
    const rows = getClickUpTaskRows([child, parent], new Set(), 'flat')

    expect(
      getClickUpGroupedTaskRows(rows, groupByStatus).map((row) =>
        row.group ? `group:${row.group.id}:${row.group.count}` : row.task?.id
      )
    ).toEqual(['group:done:1', 'child', 'group:review:1', 'parent'])
  })

  it('keeps a collapsed group header while hiding its task rows', () => {
    const review = { ...task('review-task'), status: { status: 'review' } }
    const done = { ...task('done-task'), status: { status: 'done' } }
    const rows = getClickUpTaskRows([review, done], new Set(), 'tree')

    expect(
      getClickUpGroupedTaskRows(rows, groupByStatus, new Set(['review'])).map((row) =>
        row.group ? `group:${row.group.id}:${row.group.count}` : row.task?.id
      )
    ).toEqual(['group:review:1', 'group:done:1', 'done-task'])
  })
})

describe('shouldLoadClickUpTaskChildren', () => {
  it('loads an unresolved task when the user explicitly requests it', () => {
    const unresolved = task('unresolved')

    expect(shouldLoadClickUpTaskChildren(unresolved)).toBe(true)
  })

  it('loads a known parent when its child rows are not present', () => {
    const parent = { ...task('parent'), hasSubtasks: true }

    expect(shouldLoadClickUpTaskChildren(parent)).toBe(true)
  })

  it('does not reload a parent whose branch is explicitly complete', () => {
    const parent = { ...task('parent'), hasSubtasks: true, subtaskCount: 1 }

    expect(shouldLoadClickUpTaskChildren(parent, new Set(['parent']))).toBe(false)
  })

  it('does not load a known leaf', () => {
    const leaf = { ...task('leaf'), hasSubtasks: false, subtaskCount: 0 }

    expect(shouldLoadClickUpTaskChildren(leaf)).toBe(false)
  })
})

describe('isClickUpTaskChildMetadataPending', () => {
  it('shows a spinner only for an active branch read without known children', () => {
    expect(
      isClickUpTaskChildMetadataPending(
        { ...task('parent'), hasSubtasks: true, subtaskCount: 2 },
        true,
        true
      )
    ).toBe(false)
    expect(isClickUpTaskChildMetadataPending(task('known-by-relation'), true, true)).toBe(false)
    expect(isClickUpTaskChildMetadataPending(task('loading'), true, false)).toBe(true)
    expect(isClickUpTaskChildMetadataPending(task('idle'), false, false)).toBe(false)
  })
})

describe('canExpandClickUpTask', () => {
  it('keeps unresolved list tasks discoverable without treating known leaves as parents', () => {
    expect(canExpandClickUpTask(task('unresolved'), false)).toBe(true)
    expect(canExpandClickUpTask({ ...task('leaf'), hasSubtasks: false }, false)).toBe(false)
  })

  it('does not offer unfiltered discovery inside a saved-view projection', () => {
    expect(canExpandClickUpTask(task('unresolved'), false, false)).toBe(false)
    expect(canExpandClickUpTask(task('known-by-relation'), true, false)).toBe(true)
  })
})

describe('filterClickUpTasksByClosedVisibility', () => {
  const tasks = [
    closedTask('closed-parent'),
    task('open-child', 'closed-parent'),
    task('open-grandchild', 'open-child'),
    task('open-root')
  ]

  it('hides the complete descendant branch of a closed task in tree view', () => {
    expect(filterClickUpTasksByClosedVisibility(tasks, false, 'tree').map(({ id }) => id)).toEqual([
      'open-root'
    ])
  })

  it('keeps open descendants as independent rows in flat view', () => {
    expect(filterClickUpTasksByClosedVisibility(tasks, false, 'flat').map(({ id }) => id)).toEqual([
      'open-child',
      'open-grandchild',
      'open-root'
    ])
  })

  it('returns closed tasks and their descendants when enabled', () => {
    expect(filterClickUpTasksByClosedVisibility(tasks, true, 'tree')).toEqual(tasks)
  })

  it('does not promote a subtask whose parent is not loaded into a root row', () => {
    const orphan = task('open-child', 'closed-parent')

    expect(filterClickUpTasksByClosedVisibility([orphan], false, 'tree')).toEqual([])
  })

  it('keeps a server-filtered orphan visible as a projection root', () => {
    const orphan = task('open-child', 'filtered-parent')

    expect(filterClickUpTasksByClosedVisibility([orphan], true, 'tree', true)).toEqual([orphan])
    expect(getClickUpTaskRows([orphan], new Set(), 'tree')).toEqual([
      { task: orphan, depth: 0, hasChildren: false, expanded: false }
    ])
  })
})
