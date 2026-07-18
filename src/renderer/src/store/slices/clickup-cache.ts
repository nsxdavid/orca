import type { AppState } from '../types'
import type { CacheEntry } from './github'
import { getProviderRuntimeContextKey } from '@/lib/provider-runtime-context'
import {
  getTaskSourceCacheScope,
  getTaskSourceRuntimeSettings,
  type TaskSourceContext
} from '../../../../shared/task-source-context'

const CACHE_TTL = 60_000
const MAX_CACHE_ENTRIES = 500

export type ClickUpReadOptions = { sourceContext?: TaskSourceContext | null; force?: boolean }
export type ClickUpReadScope = {
  settings: AppState['settings'] | TaskSourceContext | null
  contextKey: string
  cachePrefix: string | null
  explicitSource: boolean
  force: boolean
}

type InflightRead<T> = {
  promise: Promise<T>
  contextKey: string
  mutationGeneration: number
  force: boolean
}

const inflightReads = new Map<string, InflightRead<unknown>>()
let clickUpMutationGeneration = 0

function isFresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return entry !== undefined && Date.now() - entry.fetchedAt < CACHE_TTL
}

export function evictStaleEntries<T>(
  cache: Record<string, CacheEntry<T>>
): Record<string, CacheEntry<T>> {
  const keys = Object.keys(cache)
  if (keys.length <= MAX_CACHE_ENTRIES) {
    return cache
  }
  const sorted = keys.sort((a, b) => (cache[a]?.fetchedAt ?? 0) - (cache[b]?.fetchedAt ?? 0))
  const pruned: Record<string, CacheEntry<T>> = {}
  for (const key of sorted.slice(sorted.length - MAX_CACHE_ENTRIES)) {
    pruned[key] = cache[key]
  }
  return pruned
}

export function beginClickUpMutation(): number {
  clickUpMutationGeneration += 1
  inflightReads.clear()
  return clickUpMutationGeneration
}

export function getClickUpMutationGeneration(): number {
  return clickUpMutationGeneration
}

export function getClickUpReadScope(
  settings: AppState['settings'],
  options?: ClickUpReadOptions
): ClickUpReadScope {
  const sourceContext = options?.sourceContext
  if (!sourceContext) {
    return {
      settings,
      contextKey: getProviderRuntimeContextKey(settings),
      cachePrefix: null,
      explicitSource: false,
      force: Boolean(options?.force)
    }
  }
  const runtimeSettings = getTaskSourceRuntimeSettings(sourceContext)
  const sourceScope = getTaskSourceCacheScope(sourceContext)
  return {
    settings: sourceContext,
    contextKey: `${getProviderRuntimeContextKey(runtimeSettings)}::${sourceScope}`,
    cachePrefix: sourceScope,
    explicitSource: true,
    force: Boolean(options?.force)
  }
}

export function scopedKey(scope: ClickUpReadScope, key: string): string {
  return scope.cachePrefix ? `${scope.cachePrefix}::${key}` : key
}

function canWriteReadResult(
  scope: ClickUpReadScope,
  mutationGeneration: number,
  settings: AppState['settings']
): boolean {
  return (
    mutationGeneration === clickUpMutationGeneration &&
    (scope.explicitSource || getProviderRuntimeContextKey(settings) === scope.contextKey)
  )
}

export async function cachedRead<T>(
  key: string,
  scope: ClickUpReadScope,
  cache: Record<string, CacheEntry<T>>,
  write: (key: string, data: T) => void,
  read: () => Promise<T>,
  getSettings: () => AppState['settings']
): Promise<T> {
  const cached = cache[key]
  if (!scope.force && isFresh(cached)) {
    return cached.data as T
  }
  const inflight = inflightReads.get(key)
  if (
    inflight &&
    inflight.contextKey === scope.contextKey &&
    inflight.mutationGeneration === clickUpMutationGeneration &&
    (!scope.force || inflight.force)
  ) {
    return inflight.promise as Promise<T>
  }
  const mutationGeneration = clickUpMutationGeneration
  const promise = read().then((data) => {
    if (
      inflightReads.get(key) === entry &&
      canWriteReadResult(scope, mutationGeneration, getSettings())
    ) {
      write(key, data)
    }
    return data
  })
  const entry: InflightRead<T> = {
    promise,
    contextKey: scope.contextKey,
    mutationGeneration,
    force: Boolean(scope.force)
  }
  inflightReads.set(key, entry as InflightRead<unknown>)
  const cleanup = (): void => {
    if (inflightReads.get(key) === entry) {
      inflightReads.delete(key)
    }
  }
  // Consume both outcomes so cleanup does not create a second rejected promise.
  promise.then(cleanup, cleanup)
  return promise
}
