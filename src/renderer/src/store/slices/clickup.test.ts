import { beforeEach, describe, expect, it, vi } from 'vitest'
import { create } from 'zustand'
import type { AppState } from '../types'
import type { ClickUpTask, ClickUpUser } from '../../../../shared/types'
import {
  getTaskSourceCacheScope,
  type TaskSourceContext
} from '../../../../shared/task-source-context'
import { createClickUpSlice } from './clickup'

const clickUpListAssignableMembers = vi.fn()
const clickUpConnect = vi.fn()
const clickUpListTaskPage = vi.fn()
const clickUpListTaskSubtasks = vi.fn()
const clickUpListViewTaskPage = vi.fn()
const clickUpListViews = vi.fn()
const clickUpStatus = vi.fn()

vi.mock('@/runtime/runtime-clickup-client', () => ({
  clickUpAddTaskTag: vi.fn(),
  clickUpConnect: (...args: unknown[]) => clickUpConnect(...args),
  clickUpDisconnect: vi.fn(),
  clickUpGetTask: vi.fn(),
  clickUpListFolderlessLists: vi.fn(),
  clickUpListFolderLists: vi.fn(),
  clickUpListFolders: vi.fn(),
  clickUpListViews: (...args: unknown[]) => clickUpListViews(...args),
  clickUpListSpaceTags: vi.fn(),
  clickUpListSpaces: vi.fn(),
  clickUpListTaskPage: (...args: unknown[]) => clickUpListTaskPage(...args),
  clickUpListTaskSubtasks: (...args: unknown[]) => clickUpListTaskSubtasks(...args),
  clickUpListViewTaskPage: (...args: unknown[]) => clickUpListViewTaskPage(...args),
  clickUpListTaskTypes: vi.fn(),
  clickUpListTasks: vi.fn(),
  clickUpRemoveTaskTag: vi.fn(),
  clickUpSearchTasks: vi.fn(),
  clickUpSelectWorkspace: vi.fn(),
  clickUpStatus: (...args: unknown[]) => clickUpStatus(...args),
  clickUpTestConnection: vi.fn(),
  clickUpUpdateTask: vi.fn()
}))

vi.mock('@/runtime/runtime-clickup-views-client', () => ({
  clickUpListViews: (...args: unknown[]) => clickUpListViews(...args),
  clickUpListViewTaskPage: (...args: unknown[]) => clickUpListViewTaskPage(...args)
}))

vi.mock('@/runtime/runtime-clickup-members', () => ({
  clickUpListAssignableMembers: (...args: unknown[]) => clickUpListAssignableMembers(...args)
}))

function createTestStore() {
  return create<AppState>()(
    (...args) =>
      ({
        settings: null,
        ...createClickUpSlice(...args)
      }) as AppState
  )
}

function sourceContext(environmentId: string): TaskSourceContext {
  return {
    kind: 'task-source',
    provider: 'clickup',
    projectId: 'logical-project',
    hostId: `runtime:${environmentId}`,
    providerIdentity: {
      provider: 'clickup',
      workspaceId: 'workspace-1',
      listId: 'list-1'
    }
  }
}

function task(id: string, parentId: string | null = null): ClickUpTask {
  return {
    id,
    listId: 'list-1',
    parentId,
    title: id,
    url: `https://app.clickup.com/t/${id}`,
    assignees: [],
    tags: [],
    createdAt: '2026-07-13T00:00:00.000Z',
    updatedAt: '2026-07-13T00:00:00.000Z'
  }
}

describe('createClickUpSlice credential replacement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clears data fetched under the previous credential after replacement succeeds', async () => {
    const store = createTestStore()
    const viewer = { id: 'viewer-2', username: 'New user', email: null }
    clickUpConnect.mockResolvedValue({ ok: true, viewer })
    clickUpStatus.mockResolvedValue({
      connected: true,
      viewer,
      workspaces: [{ id: 'workspace-2', name: 'Workspace two' }],
      activeWorkspaceId: 'workspace-2',
      selectedWorkspaceId: 'workspace-2'
    })
    store.setState({
      clickUpHierarchyCache: { stale: { data: [], fetchedAt: 1 } },
      clickUpViewCache: { stale: { data: { views: [], requiredViews: [] }, fetchedAt: 1 } },
      clickUpTagCache: { stale: { data: [], fetchedAt: 1 } },
      clickUpTaskTypeCache: { stale: { data: [], fetchedAt: 1 } },
      clickUpMemberCache: { stale: { data: [], fetchedAt: 1 } },
      clickUpTaskCache: { stale: { data: task('stale'), fetchedAt: 1 } },
      clickUpTaskListCache: { stale: { data: [task('stale')], fetchedAt: 1 } },
      clickUpCommentCache: { stale: { data: [], fetchedAt: 1 } },
      clickUpTaskGraphs: {
        stale: {
          tasksById: {},
          taskOrder: [],
          rootIds: [],
          childrenByParent: {},
          childrenStateByParent: {},
          rootStatus: 'complete',
          bulkStatus: 'complete',
          generation: 1
        }
      }
    })

    await expect(store.getState().connectClickUp('replacement-token')).resolves.toEqual({
      ok: true,
      viewer
    })

    expect(clickUpConnect).toHaveBeenCalledWith(null, 'replacement-token')
    expect(store.getState()).toMatchObject({
      clickUpHierarchyCache: {},
      clickUpViewCache: {},
      clickUpTagCache: {},
      clickUpTaskTypeCache: {},
      clickUpMemberCache: {},
      clickUpTaskCache: {},
      clickUpTaskListCache: {},
      clickUpCommentCache: {},
      clickUpTaskGraphs: {}
    })
  })
})

describe('createClickUpSlice member caching', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('scopes assignable members by task source context', async () => {
    const store = createTestStore()
    const localSource = sourceContext('local-runtime')
    const remoteSource = sourceContext('remote-runtime')
    const localMembers: ClickUpUser[] = [{ id: '1', username: 'Local user', email: null }]
    const remoteMembers: ClickUpUser[] = [{ id: '2', username: 'Remote user', email: null }]
    clickUpListAssignableMembers
      .mockResolvedValueOnce(localMembers)
      .mockResolvedValueOnce(remoteMembers)

    await expect(
      store
        .getState()
        .fetchClickUpAssignableMembers('list-1', 'workspace-1', { sourceContext: localSource })
    ).resolves.toEqual(localMembers)
    await expect(
      store
        .getState()
        .fetchClickUpAssignableMembers('list-1', 'workspace-1', { sourceContext: remoteSource })
    ).resolves.toEqual(remoteMembers)

    expect(clickUpListAssignableMembers).toHaveBeenNthCalledWith(
      1,
      localSource,
      'list-1',
      'workspace-1'
    )
    expect(clickUpListAssignableMembers).toHaveBeenNthCalledWith(
      2,
      remoteSource,
      'list-1',
      'workspace-1'
    )
    const cache = store.getState().clickUpMemberCache
    expect(
      cache[`${getTaskSourceCacheScope(localSource)}::assignable-members:workspace-1:list-1`]?.data
    ).toEqual(localMembers)
    expect(
      cache[`${getTaskSourceCacheScope(remoteSource)}::assignable-members:workspace-1:list-1`]?.data
    ).toEqual(remoteMembers)
  })
})

describe('createClickUpSlice view caching', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('scopes saved views by task source context', async () => {
    const store = createTestStore()
    const localSource = sourceContext('local-runtime')
    const remoteSource = sourceContext('remote-runtime')
    const localViews = { views: [], requiredViews: [] }
    const remoteViews = {
      views: [{ id: 'remote-view', name: 'Remote view', type: 'list', required: false }],
      requiredViews: []
    }
    clickUpListViews.mockResolvedValueOnce(localViews).mockResolvedValueOnce(remoteViews)

    await store
      .getState()
      .fetchClickUpViews('list-1', 'workspace-1', { sourceContext: localSource })
    await store
      .getState()
      .fetchClickUpViews('list-1', 'workspace-1', { sourceContext: remoteSource })

    expect(clickUpListViews).toHaveBeenNthCalledWith(1, localSource, 'list-1', 'workspace-1')
    expect(clickUpListViews).toHaveBeenNthCalledWith(2, remoteSource, 'list-1', 'workspace-1')
    expect(Object.keys(store.getState().clickUpViewCache)).toHaveLength(2)
  })
})

describe('createClickUpSlice task graph', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the saved-view projection without hydrating unfiltered branches', async () => {
    const store = createTestStore()
    const context = sourceContext('view-runtime')
    const key = `${getTaskSourceCacheScope(context)}::task-graph:workspace-1:list-1:view:view-1`
    clickUpListViewTaskPage
      .mockResolvedValueOnce({ tasks: [task('first')], page: 0, hasMore: true })
      .mockResolvedValueOnce({
        tasks: [task('second', 'filtered-parent')],
        page: 1,
        hasMore: false
      })

    const args = {
      key,
      listId: 'list-1',
      viewId: 'view-1',
      filter: 'open' as const,
      workspaceId: 'workspace-1',
      options: { sourceContext: context }
    }
    await store.getState().loadClickUpTaskGraph(args)

    expect(clickUpListViewTaskPage).toHaveBeenNthCalledWith(
      1,
      context,
      'view-1',
      'list-1',
      0,
      'workspace-1'
    )
    expect(clickUpListViewTaskPage).toHaveBeenCalledTimes(2)
    expect(clickUpListTaskPage).not.toHaveBeenCalled()
    expect(clickUpListTaskSubtasks).not.toHaveBeenCalled()
    expect(store.getState().clickUpTaskGraphs[key]).toMatchObject({
      taskOrder: ['first', 'second'],
      rootStatus: 'complete',
      bulkStatus: 'complete'
    })

    clickUpListViewTaskPage.mockResolvedValueOnce({
      tasks: [task('replacement')],
      page: 0,
      hasMore: false
    })
    await store.getState().loadClickUpTaskGraph({ ...args, revalidate: true })

    expect(store.getState().clickUpTaskGraphs[key]?.taskOrder).toEqual(['replacement'])
  })

  it('does not eagerly hydrate roots with unknown child metadata', async () => {
    const store = createTestStore()
    const context = sourceContext('unknown-children-runtime')
    const key = `${getTaskSourceCacheScope(context)}::task-graph:workspace-1:list-1:open`
    clickUpListTaskPage.mockResolvedValueOnce({
      tasks: [task('unknown-root')],
      page: 0,
      hasMore: false
    })

    await store.getState().loadClickUpTaskGraph({
      key,
      listId: 'list-1',
      filter: 'open',
      workspaceId: 'workspace-1',
      options: { sourceContext: context }
    })

    expect(clickUpListTaskSubtasks).not.toHaveBeenCalled()
    expect(store.getState().clickUpTaskGraphs[key]).toMatchObject({
      rootStatus: 'complete',
      bulkStatus: 'complete',
      taskOrder: ['unknown-root']
    })
  })

  it('keeps initial loading root-only and hydrates an expanded branch on demand', async () => {
    const store = createTestStore()
    const context = sourceContext('local-runtime')
    const key = `${getTaskSourceCacheScope(context)}::task-graph:workspace-1:list-1:open`
    const parent = { ...task('parent'), hasSubtasks: true, subtaskCount: 1 }
    const child = { ...task('child', 'parent'), hasSubtasks: false, subtaskCount: 0 }
    clickUpListTaskPage.mockResolvedValueOnce({ tasks: [parent], page: 0, hasMore: false })
    clickUpListTaskSubtasks.mockResolvedValueOnce({ tasks: [child], page: 0, hasMore: false })

    const args = {
      key,
      listId: 'list-1',
      filter: 'open' as const,
      workspaceId: 'workspace-1',
      options: { sourceContext: context }
    }
    await store.getState().loadClickUpTaskGraph(args)
    expect(clickUpListTaskSubtasks).not.toHaveBeenCalled()
    await store.getState().loadClickUpTaskBranch({ ...args, taskId: 'parent' })
    await store.getState().loadClickUpTaskGraph(args)

    expect(clickUpListTaskPage).toHaveBeenCalledTimes(1)
    expect(clickUpListTaskPage).toHaveBeenCalledWith(
      context,
      'list-1',
      'open',
      0,
      'workspace-1',
      false
    )
    expect(clickUpListTaskSubtasks).toHaveBeenCalledTimes(1)
    expect(store.getState().clickUpTaskGraphs[key]).toMatchObject({
      taskOrder: ['parent', 'child'],
      rootStatus: 'complete',
      bulkStatus: 'complete',
      childrenStateByParent: {
        parent: { ids: ['child'], status: 'complete', totalHint: 1 }
      }
    })
  })

  it('keeps three expanded branch refreshes in flight without head-of-line blocking', async () => {
    const store = createTestStore()
    const context = sourceContext('concurrency-runtime')
    const key = `${getTaskSourceCacheScope(context)}::task-graph:workspace-1:list-1:open`
    const parents = ['one', 'two', 'three', 'four'].map((id) => ({
      ...task(id),
      hasSubtasks: true,
      subtaskCount: 1
    }))
    const resolvers: ((page: { tasks: ClickUpTask[]; page: number; hasMore: false }) => void)[] = []
    clickUpListTaskPage.mockResolvedValue({ tasks: parents, page: 0, hasMore: false })
    clickUpListTaskSubtasks.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve)
        })
    )

    const args = {
      key,
      listId: 'list-1',
      filter: 'open' as const,
      workspaceId: 'workspace-1',
      options: { sourceContext: context }
    }
    await store.getState().loadClickUpTaskGraph(args)
    const loading = store.getState().loadClickUpTaskGraph({
      ...args,
      revalidate: true,
      revalidateTaskIds: parents.map(({ id }) => id)
    })
    await vi.waitFor(() => expect(clickUpListTaskSubtasks).toHaveBeenCalledTimes(3))

    resolvers[0]({ tasks: [], page: 0, hasMore: false })
    await vi.waitFor(() => expect(clickUpListTaskSubtasks).toHaveBeenCalledTimes(4))
    expect(clickUpListTaskSubtasks.mock.calls[3]?.[6]).toBe('background')
    resolvers.slice(1).forEach((resolve) => resolve({ tasks: [], page: 0, hasMore: false }))
    await loading

    expect(store.getState().clickUpTaskGraphs[key]?.bulkStatus).toBe('complete')
  })

  it('ingests and finalizes a returned subtree without querying descendants again', async () => {
    const store = createTestStore()
    const context = sourceContext('subtree-runtime')
    const key = `${getTaskSourceCacheScope(context)}::task-graph:workspace-1:list-1:open`
    const parent = { ...task('parent'), hasSubtasks: true, subtaskCount: 1 }
    const child = task('child', 'parent')
    const grandchild = task('grandchild', 'child')
    clickUpListTaskPage.mockResolvedValueOnce({ tasks: [parent], page: 0, hasMore: false })
    clickUpListTaskSubtasks.mockResolvedValueOnce({
      tasks: [child],
      discoveredTasks: [child, grandchild],
      page: 0,
      hasMore: false
    })

    const args = {
      key,
      listId: 'list-1',
      filter: 'open' as const,
      workspaceId: 'workspace-1',
      options: { sourceContext: context }
    }
    await store.getState().loadClickUpTaskGraph(args)
    await store.getState().loadClickUpTaskBranch({ ...args, taskId: 'parent' })

    expect(clickUpListTaskSubtasks).toHaveBeenCalledTimes(1)
    expect(store.getState().clickUpTaskGraphs[key]).toMatchObject({
      taskOrder: ['parent', 'child', 'grandchild'],
      childrenStateByParent: {
        parent: { ids: ['child'], status: 'complete', totalHint: 1 },
        child: { ids: ['grandchild'], status: 'complete', totalHint: 1 },
        grandchild: { ids: [], status: 'complete', totalHint: 0 }
      }
    })
  })

  it('publishes the first subtree page while later pages are still loading', async () => {
    const store = createTestStore()
    const context = sourceContext('progressive-subtree-runtime')
    const key = `${getTaskSourceCacheScope(context)}::task-graph:workspace-1:list-1:open`
    const parent = { ...task('parent'), hasSubtasks: true, subtaskCount: 2 }
    const first = task('first', 'parent')
    const firstChild = task('first-child', 'first')
    const second = task('second', 'parent')
    let resolveSecondPage!: (page: {
      tasks: ClickUpTask[]
      discoveredTasks: ClickUpTask[]
      page: number
      hasMore: false
    }) => void
    clickUpListTaskPage.mockResolvedValueOnce({ tasks: [parent], page: 0, hasMore: false })
    clickUpListTaskSubtasks
      .mockResolvedValueOnce({
        tasks: [first],
        discoveredTasks: [first, firstChild],
        page: 0,
        hasMore: true
      })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondPage = resolve
          })
      )

    const args = {
      key,
      listId: 'list-1',
      filter: 'open' as const,
      workspaceId: 'workspace-1',
      options: { sourceContext: context }
    }
    await store.getState().loadClickUpTaskGraph(args)
    const loading = store.getState().loadClickUpTaskBranch({ ...args, taskId: 'parent' })
    await vi.waitFor(() => expect(clickUpListTaskSubtasks).toHaveBeenCalledTimes(2))

    expect(store.getState().clickUpTaskGraphs[key]).toMatchObject({
      taskOrder: ['parent', 'first', 'first-child'],
      childrenStateByParent: {
        parent: { ids: ['first'], status: 'loading' },
        first: { ids: ['first-child'], status: 'idle', totalHint: 1 }
      }
    })

    resolveSecondPage({
      tasks: [second],
      discoveredTasks: [second],
      page: 1,
      hasMore: false
    })
    await loading

    expect(clickUpListTaskSubtasks).toHaveBeenCalledTimes(2)
    expect(store.getState().clickUpTaskGraphs[key]?.childrenStateByParent.parent).toEqual({
      ids: ['first', 'second'],
      status: 'complete',
      totalHint: 2
    })
  })

  it('drops open-only child metadata when seeding the show-closed graph', () => {
    const store = createTestStore()
    const sourceKey = 'source:open'
    const targetKey = 'target:all'
    store
      .getState()
      .updateClickUpTaskGraphTasks(sourceKey, () => [
        { ...task('root'), hasSubtasks: false, subtaskCount: 0 }
      ])

    store.getState().seedClickUpTaskGraph(targetKey, sourceKey)

    expect(store.getState().clickUpTaskGraphs[targetKey]?.tasksById.root).not.toHaveProperty(
      'hasSubtasks'
    )
    expect(store.getState().clickUpTaskGraphs[targetKey]?.childrenStateByParent.root).toMatchObject(
      {
        status: 'idle'
      }
    )
  })

  it('lets a forced refresh supersede stale background work', async () => {
    const store = createTestStore()
    const context = sourceContext('refresh-runtime')
    const key = `${getTaskSourceCacheScope(context)}::task-graph:workspace-1:list-1:open`
    let resolveStale!: (page: { tasks: ClickUpTask[]; page: number; hasMore: false }) => void
    clickUpListTaskPage
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveStale = resolve
          })
      )
      .mockResolvedValueOnce({
        tasks: [{ ...task('fresh'), hasSubtasks: false, subtaskCount: 0 }],
        page: 0,
        hasMore: false
      })
    const args = {
      key,
      listId: 'list-1',
      filter: 'open' as const,
      workspaceId: 'workspace-1',
      options: { sourceContext: context }
    }

    const staleLoad = store.getState().loadClickUpTaskGraph(args)
    await vi.waitFor(() => expect(clickUpListTaskPage).toHaveBeenCalledTimes(1))
    await store.getState().loadClickUpTaskGraph({ ...args, force: true })
    resolveStale({
      tasks: [{ ...task('stale'), hasSubtasks: false, subtaskCount: 0 }],
      page: 0,
      hasMore: false
    })
    await staleLoad

    expect(clickUpListTaskPage).toHaveBeenCalledTimes(2)
    expect(store.getState().clickUpTaskGraphs[key]?.taskOrder).toEqual(['fresh'])
  })

  it('keeps stale branch responses out after a cold graph reset', async () => {
    const store = createTestStore()
    const context = sourceContext('cold-reset-runtime')
    const key = `${getTaskSourceCacheScope(context)}::task-graph:workspace-1:list-1:open`
    const parent = { ...task('parent'), hasSubtasks: true, subtaskCount: 1 }
    let resolveBranch!: (page: { tasks: ClickUpTask[]; page: number; hasMore: false }) => void
    store.getState().updateClickUpTaskGraphTasks(key, () => [parent])
    clickUpListTaskSubtasks.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveBranch = resolve
        })
    )

    const loading = store.getState().loadClickUpTaskBranch({
      key,
      taskId: 'parent',
      listId: 'list-1',
      filter: 'open',
      workspaceId: 'workspace-1',
      options: { sourceContext: context }
    })
    await vi.waitFor(() => expect(clickUpListTaskSubtasks).toHaveBeenCalledTimes(1))
    store.getState().resetClickUpTaskGraph(key)
    resolveBranch({
      tasks: [{ ...task('stale-child', 'parent'), hasSubtasks: false, subtaskCount: 0 }],
      page: 0,
      hasMore: false
    })
    await loading

    expect(store.getState().clickUpTaskGraphs[key]).toMatchObject({
      taskOrder: [],
      rootStatus: 'idle',
      bulkStatus: 'idle'
    })
  })

  it('deduplicates a completed branch and never fetches it again', async () => {
    const store = createTestStore()
    const context = sourceContext('branch-runtime')
    const key = `${getTaskSourceCacheScope(context)}::task-graph:workspace-1:list-1:open`
    const parent = { ...task('parent'), hasSubtasks: true, subtaskCount: 1 }
    store.getState().updateClickUpTaskGraphTasks(key, () => [parent])
    clickUpListTaskSubtasks.mockResolvedValue({
      tasks: [task('child', 'parent')],
      page: 0,
      hasMore: false
    })
    const args = {
      key,
      taskId: 'parent',
      listId: 'list-1',
      filter: 'open' as const,
      workspaceId: 'workspace-1',
      options: { sourceContext: context }
    }

    await store.getState().loadClickUpTaskBranch(args)
    await store.getState().loadClickUpTaskBranch(args)

    expect(clickUpListTaskSubtasks).toHaveBeenCalledTimes(1)
    expect(store.getState().clickUpTaskGraphs[key]?.childrenStateByParent.parent).toEqual({
      ids: ['child'],
      status: 'complete',
      totalHint: 1
    })
  })

  it('quietly revalidates an expanded subtree without returning its chevron to loading', async () => {
    const store = createTestStore()
    const context = sourceContext('quiet-refresh-runtime')
    const key = `${getTaskSourceCacheScope(context)}::task-graph:workspace-1:list-1:open`
    const parent = { ...task('parent'), hasSubtasks: true, subtaskCount: 1 }
    const child = { ...task('child', 'parent'), title: 'Old child' }
    clickUpListTaskPage.mockResolvedValue({ tasks: [parent], page: 0, hasMore: false })
    clickUpListTaskSubtasks.mockResolvedValueOnce({ tasks: [child], page: 0, hasMore: false })
    const args = {
      key,
      listId: 'list-1',
      filter: 'open' as const,
      workspaceId: 'workspace-1',
      options: { sourceContext: context }
    }
    await store.getState().loadClickUpTaskGraph(args)
    await store.getState().loadClickUpTaskBranch({ ...args, taskId: 'parent' })

    let resolveBranch!: (page: { tasks: ClickUpTask[]; page: number; hasMore: false }) => void
    clickUpListTaskSubtasks.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveBranch = resolve
        })
    )
    const refreshing = store.getState().loadClickUpTaskGraph({
      ...args,
      revalidate: true,
      revalidateTaskIds: ['child']
    })
    await vi.waitFor(() => expect(clickUpListTaskSubtasks).toHaveBeenCalledTimes(2))

    expect(store.getState().clickUpTaskGraphs[key]).toMatchObject({
      rootStatus: 'complete',
      bulkStatus: 'complete',
      childrenStateByParent: { parent: { status: 'complete' } }
    })
    expect(store.getState().clickUpTaskGraphs[key]?.tasksById.child?.title).toBe('Old child')

    resolveBranch({
      tasks: [{ ...child, title: 'Updated child' }],
      page: 0,
      hasMore: false
    })
    await refreshing

    expect(store.getState().clickUpTaskGraphs[key]?.tasksById.child?.title).toBe('Updated child')
  })

  it('refreshes a completed branch when the root snapshot reports a changed child count', async () => {
    const store = createTestStore()
    const context = sourceContext('count-refresh-runtime')
    const key = `${getTaskSourceCacheScope(context)}::task-graph:workspace-1:list-1:open`
    const parent = { ...task('parent'), hasSubtasks: true, subtaskCount: 1 }
    const first = task('first', 'parent')
    clickUpListTaskPage
      .mockResolvedValueOnce({ tasks: [parent], page: 0, hasMore: false })
      .mockResolvedValueOnce({
        tasks: [{ ...parent, subtaskCount: 2 }],
        page: 0,
        hasMore: false
      })
    let resolveChangedBranch!: (page: {
      tasks: ClickUpTask[]
      page: number
      hasMore: false
    }) => void
    clickUpListTaskSubtasks
      .mockResolvedValueOnce({ tasks: [first], page: 0, hasMore: false })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveChangedBranch = resolve
          })
      )
    const args = {
      key,
      listId: 'list-1',
      filter: 'open' as const,
      workspaceId: 'workspace-1',
      options: { sourceContext: context }
    }
    await store.getState().loadClickUpTaskGraph(args)
    await store.getState().loadClickUpTaskBranch({ ...args, taskId: 'parent' })
    const refreshing = store.getState().loadClickUpTaskGraph({
      ...args,
      revalidate: true,
      revalidateTaskIds: ['parent']
    })
    await vi.waitFor(() => expect(clickUpListTaskSubtasks).toHaveBeenCalledTimes(2))

    expect(store.getState().clickUpTaskGraphs[key]?.childrenStateByParent.parent).toMatchObject({
      ids: ['first'],
      status: 'complete',
      totalHint: 2,
      needsRevalidation: true
    })

    resolveChangedBranch({
      tasks: [first, task('second', 'parent')],
      page: 0,
      hasMore: false
    })
    await refreshing

    expect(clickUpListTaskSubtasks).toHaveBeenCalledTimes(2)
    expect(store.getState().clickUpTaskGraphs[key]?.childrenStateByParent.parent).toEqual({
      ids: ['first', 'second'],
      status: 'complete',
      totalHint: 2
    })
  })
})
