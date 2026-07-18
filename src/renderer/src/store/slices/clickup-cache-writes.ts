import type { StoreApi } from 'zustand'
import type { AppState } from '../types'
import type { CacheEntry } from './github'
import { evictStaleEntries } from './clickup-cache'
import type {
  ClickUpComment,
  ClickUpFolder,
  ClickUpList,
  ClickUpListViews,
  ClickUpSpace,
  ClickUpTag,
  ClickUpTask,
  ClickUpTaskType,
  ClickUpUser
} from '../../../../shared/types'

type SetAppState = StoreApi<AppState>['setState']

function writeCacheEntry<T>(
  set: SetAppState,
  cacheName: keyof AppState,
  cacheKey: string,
  data: T
): void {
  set((state) => ({
    [cacheName]: evictStaleEntries({
      ...(state[cacheName] as Record<string, CacheEntry<T>>),
      [cacheKey]: { data, fetchedAt: Date.now() }
    })
  }))
}

export function writeClickUpHierarchyCache(
  set: SetAppState,
  cacheKey: string,
  data: ClickUpSpace[] | ClickUpFolder[] | ClickUpList[]
): void {
  writeCacheEntry(set, 'clickUpHierarchyCache', cacheKey, data)
}

export function writeClickUpViewCache(
  set: SetAppState,
  cacheKey: string,
  data: ClickUpListViews
): void {
  writeCacheEntry(set, 'clickUpViewCache', cacheKey, data)
}

export function writeClickUpTagCache(set: SetAppState, cacheKey: string, data: ClickUpTag[]): void {
  writeCacheEntry(set, 'clickUpTagCache', cacheKey, data)
}

export function writeClickUpTaskTypeCache(
  set: SetAppState,
  cacheKey: string,
  data: ClickUpTaskType[]
): void {
  writeCacheEntry(set, 'clickUpTaskTypeCache', cacheKey, data)
}

export function writeClickUpMemberCache(
  set: SetAppState,
  cacheKey: string,
  data: ClickUpUser[]
): void {
  writeCacheEntry(set, 'clickUpMemberCache', cacheKey, data)
}

export function writeClickUpTaskListCache(
  set: SetAppState,
  cacheKey: string,
  data: ClickUpTask[]
): void {
  writeCacheEntry(set, 'clickUpTaskListCache', cacheKey, data)
}

export function writeClickUpTaskCache(
  set: SetAppState,
  cacheKey: string,
  data: ClickUpTask | null
): void {
  writeCacheEntry(set, 'clickUpTaskCache', cacheKey, data)
}

export function writeClickUpCommentCache(
  set: SetAppState,
  cacheKey: string,
  data: ClickUpComment[]
): void {
  writeCacheEntry(set, 'clickUpCommentCache', cacheKey, data)
}
