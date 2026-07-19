import type { StateCreator } from 'zustand'
import type { AppState } from '../types'
import type { ClickUpFolder, ClickUpList, ClickUpSpace } from '../../../../shared/types'
import { getProviderRuntimeContextKey } from '@/lib/provider-runtime-context'
import {
  clickUpAddTaskTag,
  clickUpConnect,
  clickUpDisconnect,
  clickUpGetTask,
  clickUpListFolderlessLists,
  clickUpListFolderLists,
  clickUpListFolders,
  clickUpListSpaceTags,
  clickUpListSpaces,
  clickUpListTaskPage,
  clickUpListTaskSubtasks,
  clickUpListTaskTypes,
  clickUpListTasks,
  clickUpSearchTasks,
  clickUpSelectWorkspace,
  clickUpStatus,
  clickUpTestConnection,
  clickUpRemoveTaskTag,
  clickUpUpdateTask
} from '@/runtime/runtime-clickup-client'
import { clickUpListViews } from '@/runtime/runtime-clickup-views-client'
import {
  beginClickUpMutation,
  cachedRead,
  getClickUpMutationGeneration,
  getClickUpReadScope,
  scopedKey
} from './clickup-cache'
import {
  writeClickUpHierarchyCache,
  writeClickUpViewCache,
  writeClickUpTagCache,
  writeClickUpTaskTypeCache,
  writeClickUpTaskCache,
  writeClickUpTaskListCache
} from './clickup-cache-writes'
import { createClickUpCommentMethods } from './clickup-comment-methods'
import { createClickUpMemberMethods } from './clickup-member-methods'
import { createClickUpTaskPatchMethod } from './clickup-task-patch-method'
import {
  clearClickUpTaskGraphInflight,
  createClickUpTaskGraphMethods
} from './clickup-task-graph-methods'
import type { ClickUpSlice } from './clickup-slice-types'
let clickUpStatusReadGeneration = 0

let get: () => AppState

function createEmptyClickUpDataState() {
  return {
    clickUpHierarchyCache: {},
    clickUpViewCache: {},
    clickUpTagCache: {},
    clickUpTaskTypeCache: {},
    clickUpMemberCache: {},
    clickUpTaskCache: {},
    clickUpTaskListCache: {},
    clickUpCommentCache: {},
    clickUpTaskGraphs: {}
  }
}

export const createClickUpSlice: StateCreator<AppState, [], [], ClickUpSlice> = (set, storeGet) => {
  get = storeGet
  return {
    clickUpStatus: { connected: false, viewer: null },
    clickUpStatusChecked: false,
    clickUpStatusContextKey: null,
    ...createEmptyClickUpDataState(),

    checkClickUpConnection: async () => {
      const contextKey = getProviderRuntimeContextKey(get().settings)
      const readGeneration = (clickUpStatusReadGeneration += 1)
      const mutationGeneration = getClickUpMutationGeneration()
      try {
        const status = await clickUpStatus(get().settings)
        if (
          mutationGeneration !== getClickUpMutationGeneration() ||
          readGeneration !== clickUpStatusReadGeneration ||
          getProviderRuntimeContextKey(get().settings) !== contextKey
        ) {
          return
        }
        set({
          clickUpStatus: status,
          clickUpStatusChecked: true,
          clickUpStatusContextKey: contextKey
        })
      } catch {
        if (
          mutationGeneration === getClickUpMutationGeneration() &&
          readGeneration === clickUpStatusReadGeneration
        ) {
          set({
            clickUpStatus: { connected: false, viewer: null },
            clickUpStatusChecked: true,
            clickUpStatusContextKey: contextKey
          })
        }
      }
    },

    connectClickUp: async (apiToken) => {
      const generation = beginClickUpMutation()
      const result = await clickUpConnect(get().settings, apiToken)
      if (generation === getClickUpMutationGeneration() && result.ok) {
        // Why: a replacement token may represent another account; old credential data cannot survive it.
        clearClickUpTaskGraphInflight()
        set({
          clickUpStatus: { connected: true, viewer: result.viewer },
          clickUpStatusChecked: true,
          clickUpStatusContextKey: getProviderRuntimeContextKey(get().settings),
          ...createEmptyClickUpDataState()
        })
        void get().checkClickUpConnection()
      }
      return result
    },

    testClickUpConnection: async () => {
      const result = await clickUpTestConnection(get().settings)
      void get().checkClickUpConnection()
      return result
    },

    disconnectClickUp: async () => {
      beginClickUpMutation()
      clearClickUpTaskGraphInflight()
      await clickUpDisconnect(get().settings)
      set({
        clickUpStatus: { connected: false, viewer: null },
        clickUpStatusChecked: true,
        clickUpStatusContextKey: getProviderRuntimeContextKey(get().settings),
        ...createEmptyClickUpDataState()
      })
    },

    selectClickUpWorkspace: async (workspaceId) => {
      beginClickUpMutation()
      clearClickUpTaskGraphInflight()
      const status = await clickUpSelectWorkspace(get().settings, workspaceId)
      set({
        clickUpStatus: status,
        clickUpStatusChecked: true,
        clickUpStatusContextKey: getProviderRuntimeContextKey(get().settings),
        ...createEmptyClickUpDataState()
      })
    },

    fetchClickUpSpaces: (workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      const key = scopedKey(scope, `spaces:${workspaceId}`)
      return cachedRead(
        key,
        scope,
        get().clickUpHierarchyCache,
        (cacheKey, data) => writeClickUpHierarchyCache(set, cacheKey, data),
        () => clickUpListSpaces(scope.settings, workspaceId),
        () => get().settings
      ) as Promise<ClickUpSpace[]>
    },

    fetchClickUpFolders: (spaceId, workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      const key = scopedKey(scope, `folders:${workspaceId ?? ''}:${spaceId}`)
      return cachedRead(
        key,
        scope,
        get().clickUpHierarchyCache,
        (cacheKey, data) => writeClickUpHierarchyCache(set, cacheKey, data),
        () => clickUpListFolders(scope.settings, spaceId, workspaceId),
        () => get().settings
      ) as Promise<ClickUpFolder[]>
    },

    fetchClickUpSpaceTags: (spaceId, workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      const key = scopedKey(scope, `space-tags:${workspaceId ?? ''}:${spaceId}`)
      return cachedRead(
        key,
        scope,
        get().clickUpTagCache,
        (cacheKey, data) => writeClickUpTagCache(set, cacheKey, data),
        () => clickUpListSpaceTags(scope.settings, spaceId, workspaceId),
        () => get().settings
      )
    },

    fetchClickUpTaskTypes: (workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      const key = scopedKey(scope, `task-types:${workspaceId ?? ''}`)
      return cachedRead(
        key,
        scope,
        get().clickUpTaskTypeCache,
        (cacheKey, data) => writeClickUpTaskTypeCache(set, cacheKey, data),
        () => clickUpListTaskTypes(scope.settings, workspaceId),
        () => get().settings
      )
    },

    fetchClickUpFolderlessLists: (spaceId, workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      const key = scopedKey(scope, `folderless:v2:${workspaceId ?? ''}:${spaceId}`)
      return cachedRead(
        key,
        scope,
        get().clickUpHierarchyCache,
        (cacheKey, data) => writeClickUpHierarchyCache(set, cacheKey, data),
        () => clickUpListFolderlessLists(scope.settings, spaceId, workspaceId),
        () => get().settings
      ) as Promise<ClickUpList[]>
    },

    fetchClickUpFolderLists: (folderId, spaceId, workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      const key = scopedKey(scope, `folder-lists:v2:${workspaceId ?? ''}:${spaceId}:${folderId}`)
      return cachedRead(
        key,
        scope,
        get().clickUpHierarchyCache,
        (cacheKey, data) => writeClickUpHierarchyCache(set, cacheKey, data),
        () => clickUpListFolderLists(scope.settings, folderId, spaceId, workspaceId),
        () => get().settings
      ) as Promise<ClickUpList[]>
    },

    fetchClickUpViews: (listId, workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      const key = scopedKey(scope, `views:${workspaceId ?? ''}:${listId}`)
      return cachedRead(
        key,
        scope,
        get().clickUpViewCache,
        (cacheKey, data) => writeClickUpViewCache(set, cacheKey, data),
        () => clickUpListViews(scope.settings, listId, workspaceId),
        () => get().settings
      )
    },

    listClickUpTasks: (listId, filter = 'open', limit = 30, workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      const key = scopedKey(scope, `tasks:${workspaceId ?? ''}:${listId}:${filter}:${limit}`)
      return cachedRead(
        key,
        scope,
        get().clickUpTaskListCache,
        (cacheKey, data) => writeClickUpTaskListCache(set, cacheKey, data),
        () => clickUpListTasks(scope.settings, listId, filter, limit, workspaceId),
        () => get().settings
      )
    },

    listClickUpTaskPage: (listId, filter, page, workspaceId, includeSubtasks, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      return clickUpListTaskPage(scope.settings, listId, filter, page, workspaceId, includeSubtasks)
    },

    listClickUpTaskSubtasks: (taskId, listId, filter, page, workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      return clickUpListTaskSubtasks(scope.settings, taskId, listId, filter, page, workspaceId)
    },

    searchClickUpTasks: (listId, query, limit = 30, workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      const key = scopedKey(scope, `task-search:${workspaceId ?? ''}:${listId}:${query}:${limit}`)
      return cachedRead(
        key,
        scope,
        get().clickUpTaskListCache,
        (cacheKey, data) => writeClickUpTaskListCache(set, cacheKey, data),
        () => clickUpSearchTasks(scope.settings, listId, query, limit, workspaceId),
        () => get().settings
      )
    },

    fetchClickUpTask: (taskId, listId, workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      const key = scopedKey(scope, `task:${workspaceId ?? ''}:${listId}:${taskId}`)
      return cachedRead(
        key,
        scope,
        get().clickUpTaskCache,
        (cacheKey, data) => writeClickUpTaskCache(set, cacheKey, data),
        () => clickUpGetTask(scope.settings, taskId, listId, workspaceId),
        () => get().settings
      )
    },

    updateClickUpTask: async (taskId, updates, workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      return clickUpUpdateTask(scope.settings, taskId, updates, workspaceId)
    },

    addClickUpTaskTag: async (taskId, tagName, workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      return clickUpAddTaskTag(scope.settings, taskId, tagName, workspaceId)
    },

    removeClickUpTaskTag: async (taskId, tagName, workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      return clickUpRemoveTaskTag(scope.settings, taskId, tagName, workspaceId)
    },

    ...createClickUpCommentMethods(set, get),
    ...createClickUpMemberMethods(set, get),
    ...createClickUpTaskPatchMethod(set),
    ...createClickUpTaskGraphMethods(set, get)
  }
}
