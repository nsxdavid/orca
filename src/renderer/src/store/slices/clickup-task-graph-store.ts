import type { StoreApi } from 'zustand'
import type { AppState } from '../types'
import { createEmptyClickUpTaskGraph } from './clickup-task-graph'
import type { ClickUpTaskGraph } from './clickup-task-graph-types'

export type ClickUpTaskGraphSet = StoreApi<AppState>['setState']
export type ClickUpTaskGraphGet = StoreApi<AppState>['getState']

export function getClickUpGraphErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to load ClickUp tasks.'
}

export function updateClickUpGraphState(
  set: ClickUpTaskGraphSet,
  key: string,
  update: (graph: ClickUpTaskGraph) => ClickUpTaskGraph,
  generation?: number
): void {
  set((state) => {
    const current = state.clickUpTaskGraphs[key] ?? createEmptyClickUpTaskGraph()
    if (generation !== undefined && current.generation !== generation) {
      return {}
    }
    const next = update(current)
    return next === current
      ? {}
      : { clickUpTaskGraphs: { ...state.clickUpTaskGraphs, [key]: next } }
  })
}
