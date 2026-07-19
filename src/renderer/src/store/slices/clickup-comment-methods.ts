import type { StoreApi } from 'zustand'
import {
  clickUpAddCommentReply,
  clickUpAddTaskComment,
  clickUpCommentReplies,
  clickUpTaskComments
} from '@/runtime/runtime-clickup-comment-client'
import type { AppState } from '../types'
import { cachedRead, getClickUpReadScope, scopedKey } from './clickup-cache'
import { writeClickUpCommentCache } from './clickup-cache-writes'
import type { ClickUpSlice } from './clickup-slice-types'

type ClickUpCommentMethods = Pick<
  ClickUpSlice,
  | 'fetchClickUpTaskComments'
  | 'addClickUpTaskComment'
  | 'fetchClickUpCommentReplies'
  | 'addClickUpCommentReply'
>

export function createClickUpCommentMethods(
  set: StoreApi<AppState>['setState'],
  get: () => AppState
): ClickUpCommentMethods {
  return {
    fetchClickUpTaskComments: (taskId, workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      const key = scopedKey(scope, `task-comments:${workspaceId ?? ''}:${taskId}`)
      return cachedRead(
        key,
        scope,
        get().clickUpCommentCache,
        (cacheKey, data) => writeClickUpCommentCache(set, cacheKey, data),
        () => clickUpTaskComments(scope.settings, taskId, workspaceId),
        () => get().settings
      )
    },

    addClickUpTaskComment: async (taskId, body, workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      return clickUpAddTaskComment(scope.settings, taskId, body, workspaceId)
    },

    fetchClickUpCommentReplies: (commentId, workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      const key = scopedKey(scope, `comment-replies:${workspaceId ?? ''}:${commentId}`)
      return cachedRead(
        key,
        scope,
        get().clickUpCommentCache,
        (cacheKey, data) => writeClickUpCommentCache(set, cacheKey, data),
        () => clickUpCommentReplies(scope.settings, commentId, workspaceId),
        () => get().settings
      )
    },

    addClickUpCommentReply: async (commentId, body, workspaceId, options) => {
      const scope = getClickUpReadScope(get().settings, options)
      return clickUpAddCommentReply(scope.settings, commentId, body, workspaceId)
    }
  }
}
