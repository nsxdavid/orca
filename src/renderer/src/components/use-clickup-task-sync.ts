import { useEffect, useRef, useState } from 'react'

import { installWindowVisibilityTimeoutPoller } from '@/lib/window-visibility-timeout-poller'
import { useAppStore } from '@/store'
import type { ClickUpTask, ClickUpTaskFilter } from '../../../shared/types'
import type { TaskSourceContext } from '../../../shared/task-source-context'

const CLICKUP_TASK_SYNC_INTERVAL_MS = 30_000
const CLICKUP_TASK_SYNC_RETRY_MS = 120_000

type UseClickUpTaskSyncArgs = {
  enabled: boolean
  graphKey: string
  listId: string | null
  viewId?: string | null
  workspaceId: string | null
  filter: ClickUpTaskFilter
  sourceContext: TaskSourceContext | null
  expandedTaskIds: ReadonlySet<string>
  selectedTaskId: string | null
  onSelectedTaskRefresh: (task: ClickUpTask) => void
}

export function useClickUpTaskSync({
  enabled,
  graphKey,
  listId,
  viewId,
  workspaceId,
  filter,
  sourceContext,
  expandedTaskIds,
  selectedTaskId,
  onSelectedTaskRefresh
}: UseClickUpTaskSyncArgs): number {
  const loadTaskGraph = useAppStore((state) => state.loadClickUpTaskGraph)
  const fetchTask = useAppStore((state) => state.fetchClickUpTask)
  const expandedTaskIdsRef = useRef<readonly string[]>([])
  const selectedTaskIdRef = useRef<string | null>(null)
  const retryDelayRef = useRef(CLICKUP_TASK_SYNC_INTERVAL_MS)
  const [activityRefreshNonce, setActivityRefreshNonce] = useState(0)

  expandedTaskIdsRef.current = [...expandedTaskIds]
  selectedTaskIdRef.current = selectedTaskId

  useEffect(() => {
    if (!enabled || !listId || !workspaceId) {
      return
    }

    retryDelayRef.current = CLICKUP_TASK_SYNC_INTERVAL_MS
    // Why: task polling must preserve the warm tree. Revalidate only visible branches and
    // selected detail while the window can actually present the result.
    return installWindowVisibilityTimeoutPoller({
      runImmediately: false,
      getDelayMs: () => retryDelayRef.current,
      run: async () => {
        const taskId = selectedTaskIdRef.current
        const graphRefresh = loadTaskGraph({
          key: graphKey,
          listId,
          viewId,
          filter,
          workspaceId,
          options: { sourceContext },
          revalidate: true,
          revalidateTaskIds: expandedTaskIdsRef.current
        })
        const detailRefresh = taskId
          ? fetchTask(taskId, listId, workspaceId, { force: true, sourceContext })
          : Promise.resolve(null)
        const [graphResult, detailResult] = await Promise.allSettled([graphRefresh, detailRefresh])

        if (
          detailResult.status === 'fulfilled' &&
          detailResult.value &&
          selectedTaskIdRef.current === taskId
        ) {
          onSelectedTaskRefresh(detailResult.value)
        }
        if (taskId && selectedTaskIdRef.current === taskId) {
          setActivityRefreshNonce((current) => current + 1)
        }

        const failure = [graphResult, detailResult].find(
          (result): result is PromiseRejectedResult => result.status === 'rejected'
        )
        retryDelayRef.current = failure ? CLICKUP_TASK_SYNC_RETRY_MS : CLICKUP_TASK_SYNC_INTERVAL_MS
        if (failure) {
          console.warn('[clickup] background task refresh failed:', failure.reason)
        }
      }
    })
  }, [
    enabled,
    fetchTask,
    filter,
    graphKey,
    listId,
    loadTaskGraph,
    onSelectedTaskRefresh,
    sourceContext,
    viewId,
    workspaceId
  ])

  return activityRefreshNonce
}
