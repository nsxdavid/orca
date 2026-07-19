import { describe, expect, it } from 'vitest'
import type { TaskSourceContext } from '../../../shared/task-source-context'

import {
  createClickUpTreeExpansionState,
  getClickUpTreeExpansionContextKey,
  getClickUpTreeExpandedIds,
  resolveClickUpTreeExpansionContext,
  updateClickUpTreeExpansion
} from './clickup-tree-expansion-state'

const sourceContext: TaskSourceContext = {
  kind: 'task-source',
  provider: 'clickup',
  projectId: 'project-1',
  hostId: 'local' as TaskSourceContext['hostId'],
  providerIdentity: {
    provider: 'clickup',
    workspaceId: 'workspace-1',
    spaceId: 'space-1',
    folderId: 'folder-1',
    listId: 'list-1'
  }
}

describe('getClickUpTreeExpansionContextKey', () => {
  it('does not change when asynchronous ClickUp hierarchy metadata arrives', () => {
    const pendingHierarchy: TaskSourceContext = {
      ...sourceContext,
      providerIdentity: {
        provider: 'clickup',
        workspaceId: 'workspace-1',
        spaceId: 'space-1',
        folderId: null,
        listId: 'list-1'
      }
    }
    const args = {
      providerRuntimeContextKey: 'local#0',
      workspaceId: 'workspace-1',
      listId: 'list-1',
      filter: 'open' as const
    }

    expect(getClickUpTreeExpansionContextKey({ ...args, sourceContext: pendingHierarchy })).toBe(
      getClickUpTreeExpansionContextKey({ ...args, sourceContext })
    )
  })

  it('remains scoped by source and list', () => {
    const base = getClickUpTreeExpansionContextKey({
      sourceContext,
      providerRuntimeContextKey: 'local#0',
      workspaceId: 'workspace-1',
      listId: 'list-1',
      filter: 'open'
    })

    expect(
      getClickUpTreeExpansionContextKey({
        sourceContext: {
          ...sourceContext,
          hostId: 'runtime:remote-1' as TaskSourceContext['hostId']
        },
        providerRuntimeContextKey: 'runtime:remote-1#0',
        workspaceId: 'workspace-1',
        listId: 'list-1',
        filter: 'open'
      })
    ).not.toBe(base)
    expect(
      getClickUpTreeExpansionContextKey({
        sourceContext,
        providerRuntimeContextKey: 'local#0',
        workspaceId: 'workspace-1',
        listId: 'list-2',
        filter: 'open'
      })
    ).not.toBe(base)
    expect(
      getClickUpTreeExpansionContextKey({
        sourceContext,
        providerRuntimeContextKey: 'local#0',
        workspaceId: 'workspace-1',
        listId: 'list-1',
        viewId: 'view-1',
        filter: 'open'
      })
    ).not.toBe(base)
  })

  it('does not key a saved view by the inactive closed-task filter', () => {
    const args = {
      sourceContext,
      providerRuntimeContextKey: 'local#0',
      workspaceId: 'workspace-1',
      listId: 'list-1',
      viewId: 'view-1'
    }

    expect(getClickUpTreeExpansionContextKey({ ...args, filter: 'open' })).toBe(
      getClickUpTreeExpansionContextKey({ ...args, filter: 'all' })
    )
  })
})

describe('ClickUp tree expansion state', () => {
  it('restores persisted IDs when the Tasks page mounts', () => {
    const state = resolveClickUpTreeExpansionContext(
      createClickUpTreeExpansionState(),
      'source:list:open',
      'source:list:open',
      ['parent-1', 'parent-2']
    )

    expect([...getClickUpTreeExpandedIds(state, 'source:list:open')]).toEqual([
      'parent-1',
      'parent-2'
    ])
  })

  it('preserves live expansion when persistence echoes for the same context', () => {
    const current = {
      contextKey: 'source:list:open',
      expandedIds: new Set(['parent-1'])
    }

    expect(
      resolveClickUpTreeExpansionContext(current, 'source:list:open', 'source:list:open', [])
    ).toBe(current)
  })

  it('waits through a transient mount context before restoring the saved graph', () => {
    const initial = createClickUpTreeExpansionState()
    const transient = resolveClickUpTreeExpansionContext(
      initial,
      'source:pending-list:open',
      'source:list:open',
      ['parent-1']
    )
    const restored = resolveClickUpTreeExpansionContext(
      transient,
      'source:list:open',
      'source:list:open',
      ['parent-1']
    )

    expect(transient).toBe(initial)
    expect([...getClickUpTreeExpandedIds(restored, 'source:list:open')]).toEqual(['parent-1'])
  })

  it('starts collapsed after an in-page graph context change', () => {
    const current = {
      contextKey: 'source:list:open',
      expandedIds: new Set(['parent-1'])
    }
    const next = resolveClickUpTreeExpansionContext(
      current,
      'source:other-list:open',
      'source:other-list:open',
      ['stale-parent']
    )

    expect([...getClickUpTreeExpandedIds(next, 'source:other-list:open')]).toEqual([])
  })

  it('does not expose expansion IDs under the wrong context', () => {
    const state = {
      contextKey: 'source:list:open',
      expandedIds: new Set(['parent-1'])
    }

    expect([...getClickUpTreeExpandedIds(state, 'source:other-list:open')]).toEqual([])
  })

  it('updates expansion against the active context only', () => {
    const state = {
      contextKey: 'source:list:open',
      expandedIds: new Set(['stale-parent'])
    }
    const next = updateClickUpTreeExpansion(state, 'source:other-list:open', (current) =>
      new Set(current).add('parent-2')
    )

    expect([...next.expandedIds]).toEqual(['parent-2'])
  })
})
