import type { StoreApi } from 'zustand'
import { clickUpListAssignableMembers } from '@/runtime/runtime-clickup-members'
import type { AppState } from '../types'
import { cachedRead, getClickUpReadScope, scopedKey } from './clickup-cache'
import { writeClickUpMemberCache } from './clickup-cache-writes'
import type { ClickUpSlice } from './clickup-slice-types'

type ClickUpMemberMethods = Pick<ClickUpSlice, 'fetchClickUpAssignableMembers'>

export function createClickUpMemberMethods(
  set: StoreApi<AppState>['setState'],
  get: () => AppState
): ClickUpMemberMethods {
  return {
    fetchClickUpAssignableMembers: (listId, workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      const key = scopedKey(scope, `assignable-members:${workspaceId ?? ''}:${listId}`)
      return cachedRead(
        key,
        scope,
        get().clickUpMemberCache,
        (cacheKey, data) => writeClickUpMemberCache(set, cacheKey, data),
        () => clickUpListAssignableMembers(scope.settings, listId, workspaceId),
        () => get().settings
      )
    }
  }
}
