import {
  getTaskSourceCacheScope,
  type TaskSourceContext
} from '../../../shared/task-source-context'

export type ClickUpTreeExpansionState = {
  contextKey: string | null
  expandedIds: Set<string>
}

export type ClickUpTreeExpansionUpdate =
  | ReadonlySet<string>
  | ((current: ReadonlySet<string>) => ReadonlySet<string>)

const EMPTY_EXPANDED_IDS: ReadonlySet<string> = new Set()

export function getClickUpTreeExpansionContextKey(args: {
  sourceContext: TaskSourceContext | null
  providerRuntimeContextKey: string
  workspaceId: string | null
  listId: string | null
  viewId?: string | null
  filter: 'all' | 'open'
}): string {
  const sourceScope = args.sourceContext
    ? getTaskSourceCacheScope({ ...args.sourceContext, providerIdentity: null })
    : `clickup:${args.providerRuntimeContextKey}`
  const projection = args.viewId ? `view:${args.viewId}` : args.filter
  return `${sourceScope}::tree-expansion:${args.workspaceId ?? ''}:${args.listId ?? ''}:${projection}`
}

export function createClickUpTreeExpansionState(): ClickUpTreeExpansionState {
  return { contextKey: null, expandedIds: new Set() }
}

export function getClickUpTreeExpandedIds(
  state: ClickUpTreeExpansionState,
  contextKey: string
): ReadonlySet<string> {
  return state.contextKey === contextKey ? state.expandedIds : EMPTY_EXPANDED_IDS
}

export function resolveClickUpTreeExpansionContext(
  state: ClickUpTreeExpansionState,
  contextKey: string,
  resumedContextKey: string | undefined,
  resumedIds: readonly string[]
): ClickUpTreeExpansionState {
  if (state.contextKey === contextKey) {
    return state
  }

  // Why: ClickUp scope can be transient during remount; wait for the saved graph before consuming restore.
  if (state.contextKey === null && resumedContextKey && resumedContextKey !== contextKey) {
    return state
  }

  return {
    contextKey,
    expandedIds: new Set(
      state.contextKey === null && resumedContextKey === contextKey ? resumedIds : []
    )
  }
}

export function updateClickUpTreeExpansion(
  state: ClickUpTreeExpansionState,
  contextKey: string,
  update: ClickUpTreeExpansionUpdate
): ClickUpTreeExpansionState {
  const currentIds = getClickUpTreeExpandedIds(state, contextKey)
  const nextIds = typeof update === 'function' ? update(currentIds) : update
  return { contextKey, expandedIds: new Set(nextIds) }
}
