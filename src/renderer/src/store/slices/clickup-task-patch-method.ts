import type { StoreApi } from 'zustand'
import { getTaskSourceCacheScope } from '../../../../shared/task-source-context'
import type { AppState } from '../types'
import type { ClickUpSlice } from './clickup-slice-types'

type ClickUpTaskPatchMethod = Pick<ClickUpSlice, 'patchClickUpTask'>

export function createClickUpTaskPatchMethod(
  set: StoreApi<AppState>['setState']
): ClickUpTaskPatchMethod {
  return {
    patchClickUpTask: (taskId, patch, options) => {
      const sourceScope =
        options?.sourceContext?.provider === 'clickup'
          ? getTaskSourceCacheScope(options.sourceContext)
          : null
      const canPatch = (key: string): boolean =>
        sourceScope === null || key.startsWith(`${sourceScope}::`)
      set((state) => {
        const taskCache = { ...state.clickUpTaskCache }
        const listCache = { ...state.clickUpTaskListCache }
        const taskGraphs = { ...state.clickUpTaskGraphs }
        let changed = false
        for (const [key, entry] of Object.entries(taskCache)) {
          if (canPatch(key) && entry.data?.id === taskId) {
            taskCache[key] = { ...entry, data: { ...entry.data, ...patch }, fetchedAt: 0 }
            changed = true
          }
        }
        for (const [key, entry] of Object.entries(listCache)) {
          if (!canPatch(key) || !entry.data) {
            continue
          }
          const index = entry.data.findIndex((task) => task.id === taskId)
          if (index !== -1) {
            const data = [...entry.data]
            data[index] = { ...data[index], ...patch }
            listCache[key] = { ...entry, data }
            changed = true
          }
        }
        for (const [key, graph] of Object.entries(taskGraphs)) {
          if (!canPatch(key) || !graph.tasksById[taskId]) {
            continue
          }
          taskGraphs[key] = {
            ...graph,
            tasksById: {
              ...graph.tasksById,
              [taskId]: { ...graph.tasksById[taskId], ...patch }
            }
          }
          changed = true
        }
        return changed
          ? {
              clickUpTaskCache: taskCache,
              clickUpTaskListCache: listCache,
              clickUpTaskGraphs: taskGraphs
            }
          : {}
      })
    }
  }
}
