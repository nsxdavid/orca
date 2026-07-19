import type { ClickUpTask } from '../../../../shared/types'
import { getClickUpReadScope } from './clickup-cache'
import type { ClickUpSlice } from './clickup-slice-types'
import {
  completeClickUpTaskRootSnapshot,
  completeClickUpTaskViewSnapshot,
  createEmptyClickUpTaskGraph,
  getClickUpTaskGraphRevalidationRootIds,
  mergeClickUpTaskGraphTasks,
  replaceClickUpTaskGraphTasks,
  setClickUpTaskGraphLoadStatus
} from './clickup-task-graph'
import {
  getClickUpGraphErrorMessage,
  type ClickUpTaskGraphGet,
  type ClickUpTaskGraphSet,
  updateClickUpGraphState
} from './clickup-task-graph-store'
import { performClickUpTaskBranchLoad } from './clickup-task-branch-load'
import { readClickUpTaskGraphPage } from './clickup-task-graph-page-read'

const GRAPH_TTL_MS = 60_000
// Expanded branches can refresh together without serializing every visible tree section.
const BRANCH_HYDRATION_CONCURRENCY = 3
const snapshotLoads = new Map<string, Promise<void>>()
const branchLoads = new Map<string, Promise<void>>()
let nextGraphGeneration = 0

export function clearClickUpTaskGraphInflight(graphKey?: string): void {
  if (!graphKey) {
    snapshotLoads.clear()
    branchLoads.clear()
    return
  }
  snapshotLoads.delete(graphKey)
  for (const key of branchLoads.keys()) {
    if (key.startsWith(`${graphKey}:`)) {
      branchLoads.delete(key)
    }
  }
}

type GraphMethods = Pick<
  ClickUpSlice,
  | 'loadClickUpTaskGraph'
  | 'loadClickUpTaskBranch'
  | 'resetClickUpTaskGraph'
  | 'seedClickUpTaskGraph'
  | 'updateClickUpTaskGraphTasks'
>

function loadTaskBranch(
  args: Parameters<ClickUpSlice['loadClickUpTaskBranch']>[0],
  set: ClickUpTaskGraphSet,
  get: ClickUpTaskGraphGet
): Promise<void> {
  if (args.viewId) {
    return Promise.resolve()
  }
  const key = `${args.key}:${args.taskId}`
  const graph = get().clickUpTaskGraphs[args.key]
  if (graph?.childrenStateByParent[args.taskId]?.status === 'complete' && !args.revalidate) {
    return Promise.resolve()
  }
  const existing = branchLoads.get(key)
  if (existing) {
    return existing
  }
  const promise = performClickUpTaskBranchLoad(args, set, get).finally(() =>
    branchLoads.delete(key)
  )
  branchLoads.set(key, promise)
  return promise
}

async function hydrateTaskBranches(
  args: Parameters<ClickUpSlice['loadClickUpTaskGraph']>[0],
  set: ClickUpTaskGraphSet,
  get: ClickUpTaskGraphGet,
  generation: number,
  quiet = false
): Promise<void> {
  const revalidationRootIds = getClickUpTaskGraphRevalidationRootIds(
    get().clickUpTaskGraphs[args.key] ?? createEmptyClickUpTaskGraph(),
    args.revalidateTaskIds ?? []
  )
  // Why: initial task loading must stay root-only; branch reads are reserved for rows the user
  // expanded and for those same visible branches during background revalidation.
  const taskIds = [...revalidationRootIds]
  let cursor = 0
  let firstError: string | undefined
  const worker = async (): Promise<void> => {
    while (cursor < taskIds.length) {
      if (get().clickUpTaskGraphs[args.key]?.generation !== generation) {
        return
      }
      const taskId = taskIds[cursor]
      cursor += 1
      const graph = get().clickUpTaskGraphs[args.key]
      const task = graph?.tasksById[taskId]
      const revalidate =
        revalidationRootIds.has(taskId) ||
        graph?.childrenStateByParent[taskId]?.needsRevalidation === true
      if (
        !task ||
        // Unknown metadata remains expandable on demand; only known parents hydrate eagerly.
        task.hasSubtasks !== true ||
        (graph.childrenStateByParent[taskId]?.status === 'complete' && !revalidate)
      ) {
        continue
      }
      try {
        // Why: one parent-filtered read returns the full subtree. Descendants are finalized by
        // that read and must not be scheduled again as individual discovery requests.
        await loadTaskBranch({ ...args, taskId, priority: 'background', revalidate }, set, get)
      } catch (error) {
        firstError ??= getClickUpGraphErrorMessage(error)
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(BRANCH_HYDRATION_CONCURRENCY, taskIds.length) }, worker)
  )

  if (firstError && quiet) {
    throw new Error(firstError)
  }
  updateClickUpGraphState(
    set,
    args.key,
    (graph) => ({
      ...graph,
      bulkStatus: firstError ? 'error' : 'complete',
      error: firstError,
      fetchedAt: Date.now()
    }),
    generation
  )
}

async function performGraphLoad(
  args: Parameters<ClickUpSlice['loadClickUpTaskGraph']>[0],
  set: ClickUpTaskGraphSet,
  get: ClickUpTaskGraphGet
): Promise<void> {
  const scope = getClickUpReadScope(get().settings, args.options)
  const current = get().clickUpTaskGraphs[args.key]
  if (
    !args.force &&
    !args.revalidate &&
    current?.bulkStatus === 'complete' &&
    current.fetchedAt !== undefined &&
    Date.now() - current.fetchedAt < GRAPH_TTL_MS
  ) {
    return
  }

  const quiet = Boolean(args.revalidate && current?.rootStatus === 'complete')
  const generation = quiet ? (current?.generation ?? 0) : (nextGraphGeneration += 1)
  if (!quiet) {
    updateClickUpGraphState(set, args.key, (graph) => ({
      ...graph,
      generation,
      rootStatus: 'loading',
      bulkStatus: 'idle',
      error: undefined
    }))
  }

  const seenRootIds = new Set<string>()
  const seenTaskIds = new Set<string>()
  const rootTasks: ClickUpTask[] = []
  const completeParentIds = new Set<string>()
  try {
    let page = 0
    let hasMore = true
    while (hasMore) {
      const result = await readClickUpTaskGraphPage({
        settings: scope.settings,
        viewId: args.viewId,
        listId: args.listId,
        filter: args.filter,
        page,
        workspaceId: args.workspaceId
      })
      for (const task of result.tasks) {
        seenTaskIds.add(task.id)
        if (!task.parentId) {
          seenRootIds.add(task.id)
        }
        rootTasks.push(task)
      }
      for (const parentId of result.completeParentIds ?? []) {
        completeParentIds.add(parentId)
      }
      if (!quiet) {
        updateClickUpGraphState(
          set,
          args.key,
          (graph) => mergeClickUpTaskGraphTasks(graph, result.tasks, result.completeParentIds),
          generation
        )
      }
      hasMore = result.hasMore
      page += 1
    }
  } catch (error) {
    if (!quiet) {
      updateClickUpGraphState(
        set,
        args.key,
        (graph) =>
          setClickUpTaskGraphLoadStatus(
            graph,
            'rootStatus',
            'error',
            getClickUpGraphErrorMessage(error)
          ),
        generation
      )
    }
    throw error
  }

  updateClickUpGraphState(
    set,
    args.key,
    (graph) => {
      const merged = quiet
        ? mergeClickUpTaskGraphTasks(graph, rootTasks, [...completeParentIds])
        : graph
      if (args.viewId) {
        // Why: view-task results are the complete filtered projection. Branch reads would
        // bypass that filter, so the returned IDs are the authoritative snapshot.
        return completeClickUpTaskViewSnapshot(merged, seenTaskIds)
      }
      const completed = completeClickUpTaskRootSnapshot(merged, seenRootIds)
      return quiet ? completed : { ...completed, bulkStatus: 'loading' }
    },
    generation
  )
  if (args.viewId) {
    return
  }
  await hydrateTaskBranches(args, set, get, generation, quiet)
}

export function createClickUpTaskGraphMethods(
  set: ClickUpTaskGraphSet,
  get: ClickUpTaskGraphGet
): GraphMethods {
  return {
    loadClickUpTaskGraph: (args) => {
      const existing = snapshotLoads.get(args.key)
      if (existing && !args.force) {
        return existing
      }
      if (args.force) {
        for (const key of branchLoads.keys()) {
          if (key.startsWith(`${args.key}:`)) {
            branchLoads.delete(key)
          }
        }
      }
      const promise = performGraphLoad(args, set, get).finally(() => {
        if (snapshotLoads.get(args.key) === promise) {
          snapshotLoads.delete(args.key)
        }
      })
      snapshotLoads.set(args.key, promise)
      return promise
    },
    loadClickUpTaskBranch: (args) => loadTaskBranch(args, set, get),
    resetClickUpTaskGraph: (key) => {
      clearClickUpTaskGraphInflight(key)
      const generation = (nextGraphGeneration += 1)
      set((state) => ({
        clickUpTaskGraphs: {
          ...state.clickUpTaskGraphs,
          [key]: { ...createEmptyClickUpTaskGraph(), generation }
        }
      }))
    },
    seedClickUpTaskGraph: (targetKey, sourceKey) => {
      set((state) => {
        if (state.clickUpTaskGraphs[targetKey] || !state.clickUpTaskGraphs[sourceKey]) {
          return {}
        }
        const source = state.clickUpTaskGraphs[sourceKey]
        const seeded = mergeClickUpTaskGraphTasks(
          createEmptyClickUpTaskGraph(),
          source.taskOrder.flatMap((id) => {
            const sourceTask = source.tasksById[id]
            if (!sourceTask) {
              return []
            }
            const task = { ...sourceTask }
            // Why: child counts are filter-specific. An open-only leaf may have closed children
            // and must be unresolved when it seeds the show-closed graph.
            delete task.hasSubtasks
            delete task.subtaskCount
            return [task]
          })
        )
        return { clickUpTaskGraphs: { ...state.clickUpTaskGraphs, [targetKey]: seeded } }
      })
    },
    updateClickUpTaskGraphTasks: (key, updater) => {
      updateClickUpGraphState(set, key, (graph) => {
        const tasks = graph.taskOrder.flatMap((id) => graph.tasksById[id] ?? [])
        const updated = updater(tasks)
        return updated === tasks ? graph : replaceClickUpTaskGraphTasks(graph, updated)
      })
    }
  }
}
