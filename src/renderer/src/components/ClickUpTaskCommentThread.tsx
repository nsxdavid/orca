import React, { useCallback, useEffect, useRef, useState } from 'react'
import { LoaderCircle, RefreshCw, Send } from 'lucide-react'
import { toast } from 'sonner'

import ClickUpCommentCard from '@/components/ClickUpCommentCard'
import ClickUpCommentThreadView from '@/components/ClickUpCommentThreadView'
import { orderClickUpCommentsOldestFirst } from '@/components/clickup-comment-order'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  getCommentBodySubmitState,
  hasBoundedCommentBodyText
} from '@/lib/comment-body-submit-state'
import { cn } from '@/lib/utils'
import { createBrowserUuid } from '@/lib/browser-uuid'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import type { ClickUpComment, ClickUpTask } from '../../../shared/types'
import type { TaskSourceContext } from '../../../shared/task-source-context'

type ClickUpTaskCommentThreadProps = {
  task: ClickUpTask
  sourceContext?: TaskSourceContext | null
  workspaceId?: string | null
  onCommentsChange?: (comments: ClickUpComment[]) => void
  layout?: 'inline' | 'panel'
  refreshNonce?: number
}

export default function ClickUpTaskCommentThread({
  task,
  sourceContext,
  workspaceId,
  onCommentsChange,
  layout = 'inline',
  refreshNonce = 0
}: ClickUpTaskCommentThreadProps): React.JSX.Element {
  const fetchComments = useAppStore((s) => s.fetchClickUpTaskComments)
  const addComment = useAppStore((s) => s.addClickUpTaskComment)
  const [comments, setComments] = useState<ClickUpComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [selectedThread, setSelectedThread] = useState<{
    comment: ClickUpComment
    replies: ClickUpComment[]
  } | null>(null)
  const requestIdRef = useRef(0)
  const optimisticCommentsRef = useRef<ClickUpComment[]>([])
  const handledRefreshNonceRef = useRef(refreshNonce)

  const setVisibleComments = useCallback(
    (nextComments: ClickUpComment[]) => {
      const orderedComments = orderClickUpCommentsOldestFirst(nextComments)
      setComments(orderedComments)
      onCommentsChange?.(orderedComments)
    },
    [onCommentsChange]
  )

  const loadComments = useCallback(
    async (requestId: number, force = false, quiet = false): Promise<void> => {
      if (!quiet) {
        setCommentsLoading(true)
        setCommentsError(null)
      }
      try {
        let fetched = await fetchComments(task.id, workspaceId, {
          force,
          sourceContext
        })
        if (requestId !== requestIdRef.current) {
          return
        }
        const optimistic = optimisticCommentsRef.current
        if (optimistic.length > 0) {
          const fetchedIds = new Set(fetched.map((comment) => comment.id))
          fetched = [...fetched, ...optimistic.filter((comment) => !fetchedIds.has(comment.id))]
        }
        setVisibleComments(fetched)
      } catch (loadError) {
        if (!quiet && requestId === requestIdRef.current) {
          setCommentsError(
            loadError instanceof Error
              ? loadError.message
              : translate(
                  'auto.components.ClickUpTaskWorkspace.commentsFailed',
                  'Failed to load comments.'
                )
          )
        }
      } finally {
        if (!quiet && requestId === requestIdRef.current) {
          setCommentsLoading(false)
        }
      }
    },
    [fetchComments, setVisibleComments, sourceContext, task.id, workspaceId]
  )

  useEffect(() => {
    requestIdRef.current += 1
    const requestId = requestIdRef.current
    optimisticCommentsRef.current = []
    setVisibleComments([])
    setCommentsError(null)
    setCommentDraft('')
    setSelectedThread(null)
    // Why: reply counts can change independently of task data and must not be hidden by a fresh cache entry.
    void loadComments(requestId, true)
  }, [loadComments, setVisibleComments, task.id])

  useEffect(() => {
    if (refreshNonce === handledRefreshNonceRef.current) {
      return
    }
    handledRefreshNonceRef.current = refreshNonce
    void loadComments(requestIdRef.current, true, true)
  }, [loadComments, refreshNonce])

  const canSubmitComment = hasBoundedCommentBodyText(commentDraft)

  const handleSubmitComment = useCallback(async (): Promise<void> => {
    if (commentSubmitting) {
      return
    }
    const bodyState = getCommentBodySubmitState(commentDraft)
    if (bodyState.status === 'empty') {
      return
    }
    if (bodyState.status === 'too-large-leading-whitespace') {
      toast.error(
        translate(
          'auto.components.ClickUpTaskWorkspace.commentTooLarge',
          'Comment is too large to submit safely.'
        )
      )
      return
    }
    setCommentSubmitting(true)
    try {
      const result = await addComment(task.id, bodyState.body, workspaceId, { sourceContext })
      if (!result.ok) {
        throw new Error(result.error)
      }
      const comment: ClickUpComment = {
        id: result.id || createBrowserUuid(),
        body: bodyState.body,
        createdAt: new Date().toISOString(),
        user: { id: 'local', username: 'You' }
      }
      optimisticCommentsRef.current.push(comment)
      setVisibleComments([...comments, comment])
      setCommentDraft('')
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : translate(
              'auto.components.ClickUpTaskWorkspace.addCommentFailed',
              'Failed to add comment.'
            )
      )
    } finally {
      setCommentSubmitting(false)
    }
  }, [
    addComment,
    commentDraft,
    commentSubmitting,
    comments,
    setVisibleComments,
    sourceContext,
    task.id,
    workspaceId
  ])

  const commentList = (
    <div className="space-y-4">
      {commentsLoading && comments.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : null}
      {comments.map((comment) => (
        <ClickUpCommentCard
          key={comment.id}
          comment={comment}
          layout={layout}
          workspaceId={workspaceId}
          sourceContext={sourceContext}
          onOpenThread={(selectedComment, replies) =>
            setSelectedThread({ comment: selectedComment, replies })
          }
        />
      ))}
      {comments.length === 0 && !commentsLoading ? (
        <p className="text-sm text-muted-foreground">
          {translate('auto.components.ClickUpTaskWorkspace.noComments', 'No comments yet.')}
        </p>
      ) : null}
    </div>
  )

  const commentComposer = (
    <div
      className={cn(
        'rounded-md border border-border/70 p-3',
        layout === 'inline' && 'mt-5 bg-card',
        layout === 'panel' && 'bg-background'
      )}
    >
      <textarea
        value={commentDraft}
        onChange={(event) => setCommentDraft(event.target.value)}
        placeholder={translate(
          'auto.components.ClickUpTaskWorkspace.commentPlaceholder',
          'Add a comment'
        )}
        className={cn(
          'min-h-[92px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow]',
          'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
        )}
      />
      <div className="mt-2 flex justify-end">
        <Button
          type="button"
          size="sm"
          className="gap-2"
          disabled={!canSubmitComment || commentSubmitting}
          onClick={() => void handleSubmitComment()}
        >
          {commentSubmitting ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {translate('auto.components.ClickUpTaskWorkspace.comment', 'Comment')}
        </Button>
      </div>
    </div>
  )

  if (layout === 'panel') {
    return (
      <section className="flex h-full min-h-0 flex-col bg-muted/15">
        <div className="flex h-14 flex-none items-center justify-between gap-3 border-b border-border/60 px-4">
          <h3 className="text-sm font-semibold text-foreground">
            {translate('auto.components.ClickUpTaskWorkspace.activity', 'Activity')}
          </h3>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => void loadComments(requestIdRef.current, true)}
                disabled={commentsLoading}
                aria-label={translate('auto.components.ClickUpTaskWorkspace.refresh', 'Refresh')}
              >
                {commentsLoading ? (
                  <LoaderCircle className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={6}>
              {translate('auto.components.ClickUpTaskWorkspace.refresh', 'Refresh')}
            </TooltipContent>
          </Tooltip>
        </div>
        {selectedThread ? (
          <ClickUpCommentThreadView
            parentComment={selectedThread.comment}
            initialReplies={selectedThread.replies}
            workspaceId={workspaceId}
            sourceContext={sourceContext}
            onBack={() => setSelectedThread(null)}
          />
        ) : (
          <>
            <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {commentsError ? (
                <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {commentsError}
                </div>
              ) : null}
              {commentList}
            </div>
            {/* Keep the composer reachable while long task activity scrolls independently. */}
            <div className="flex-none border-t border-border/60 bg-background p-3">
              {commentComposer}
            </div>
          </>
        )}
      </section>
    )
  }

  if (selectedThread) {
    return (
      <section className="mt-8 flex min-h-[520px] max-w-[760px] flex-col overflow-hidden rounded-md border border-border/60">
        <ClickUpCommentThreadView
          parentComment={selectedThread.comment}
          initialReplies={selectedThread.replies}
          workspaceId={workspaceId}
          sourceContext={sourceContext}
          onBack={() => setSelectedThread(null)}
        />
      </section>
    )
  }

  return (
    <section className="mt-8 max-w-[760px]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
          {translate('auto.components.ClickUpTaskWorkspace.activity', 'Activity')}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="gap-1.5"
          onClick={() => void loadComments(requestIdRef.current, true)}
          disabled={commentsLoading}
        >
          {commentsLoading ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          {translate('auto.components.ClickUpTaskWorkspace.refresh', 'Refresh')}
        </Button>
      </div>

      {commentsError ? (
        <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {commentsError}
        </div>
      ) : null}

      {commentList}
      {commentComposer}
    </section>
  )
}
