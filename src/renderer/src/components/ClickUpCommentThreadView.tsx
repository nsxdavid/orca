import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, LoaderCircle, RefreshCw, Send } from 'lucide-react'
import { toast } from 'sonner'

import ClickUpCommentAvatar from '@/components/ClickUpCommentAvatar'
import { orderClickUpCommentsOldestFirst } from '@/components/clickup-comment-order'
import CommentMarkdown from '@/components/sidebar/CommentMarkdown'
import { Button } from '@/components/ui/button'
import { formatClickUpRelativeTime } from '@/components/clickup-task-workspace-text'
import { createBrowserUuid } from '@/lib/browser-uuid'
import {
  getCommentBodySubmitState,
  hasBoundedCommentBodyText
} from '@/lib/comment-body-submit-state'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import type { ClickUpComment } from '../../../shared/types'
import type { TaskSourceContext } from '../../../shared/task-source-context'

type ClickUpCommentThreadViewProps = {
  parentComment: ClickUpComment
  initialReplies?: ClickUpComment[]
  onBack: () => void
  sourceContext?: TaskSourceContext | null
  workspaceId?: string | null
}

const EMPTY_CLICKUP_COMMENTS: ClickUpComment[] = []

export default function ClickUpCommentThreadView({
  parentComment,
  initialReplies = EMPTY_CLICKUP_COMMENTS,
  onBack,
  sourceContext,
  workspaceId
}: ClickUpCommentThreadViewProps): React.JSX.Element {
  const fetchReplies = useAppStore((state) => state.fetchClickUpCommentReplies)
  const addReply = useAppStore((state) => state.addClickUpCommentReply)
  const [replies, setReplies] = useState(() => orderClickUpCommentsOldestFirst(initialReplies))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const requestIdRef = useRef(0)

  const loadReplies = useCallback(
    async (force = false): Promise<void> => {
      requestIdRef.current += 1
      const requestId = requestIdRef.current
      setLoading(true)
      setError(null)
      try {
        const nextReplies = await fetchReplies(parentComment.id, workspaceId, {
          force,
          sourceContext
        })
        if (requestId === requestIdRef.current) {
          setReplies(orderClickUpCommentsOldestFirst(nextReplies))
        }
      } catch (loadError) {
        if (requestId === requestIdRef.current) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : translate(
                  'auto.components.ClickUpTaskWorkspace.repliesFailed',
                  'Failed to load replies.'
                )
          )
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [fetchReplies, parentComment.id, sourceContext, workspaceId]
  )

  useEffect(() => {
    setReplies(orderClickUpCommentsOldestFirst(initialReplies))
    setDraft('')
    void loadReplies(true)
  }, [initialReplies, loadReplies, parentComment.id])

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (submitting) {
      return
    }
    const bodyState = getCommentBodySubmitState(draft)
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
    setSubmitting(true)
    try {
      const result = await addReply(parentComment.id, bodyState.body, workspaceId, {
        sourceContext
      })
      if (!result.ok) {
        throw new Error(result.error)
      }
      const optimisticReply: ClickUpComment = {
        id: result.id || createBrowserUuid(),
        body: bodyState.body,
        createdAt: new Date().toISOString(),
        user: { id: 'local', username: 'You' }
      }
      setReplies((current) => orderClickUpCommentsOldestFirst([...current, optimisticReply]))
      setDraft('')
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : translate('auto.components.ClickUpTaskWorkspace.addReplyFailed', 'Failed to add reply.')
      )
    } finally {
      setSubmitting(false)
    }
  }, [addReply, draft, parentComment.id, sourceContext, submitting, workspaceId])

  const authorName =
    parentComment.user?.username ??
    translate('auto.components.ClickUpTaskWorkspace.someone', 'Someone')

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-muted/15">
      <div className="grid h-12 flex-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/60 px-3">
        <Button type="button" variant="ghost" size="sm" className="gap-1" onClick={onBack}>
          <ChevronLeft className="size-4" />
          {translate('auto.components.ClickUpTaskWorkspace.back', 'Back')}
        </Button>
        <div className="flex min-w-0 items-center justify-center gap-1.5 text-sm font-medium text-foreground">
          <span className="shrink-0">
            {translate('auto.components.ClickUpTaskWorkspace.threadBy', 'Thread by')}
          </span>
          <ClickUpCommentAvatar comment={parentComment} className="size-5" />
          <span className="truncate">{authorName}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => void loadReplies(true)}
          disabled={loading}
          aria-label={translate('auto.components.ClickUpTaskWorkspace.refresh', 'Refresh')}
        >
          {loading ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
        </Button>
      </div>

      <div className="scrollbar-sleek min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}
        {loading && replies.length === 0 ? (
          <div className="flex justify-center py-8">
            <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : null}
        {replies.map((reply) => (
          <article key={reply.id} className="rounded-md border border-border/60 bg-card shadow-xs">
            <div className="flex gap-3 p-3">
              <ClickUpCommentAvatar comment={reply} />
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-baseline gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {reply.user?.username ??
                      translate('auto.components.ClickUpTaskWorkspace.someone', 'Someone')}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatClickUpRelativeTime(reply.createdAt)}
                  </span>
                </div>
                <CommentMarkdown
                  content={reply.body}
                  variant="document"
                  className="text-sm text-foreground"
                />
              </div>
            </div>
          </article>
        ))}
        {!loading && replies.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {translate('auto.components.ClickUpTaskWorkspace.noReplies', 'No replies yet.')}
          </p>
        ) : null}
      </div>

      <div className="flex-none border-t border-border/60 bg-background p-3">
        <div className="rounded-md border border-border/70 bg-background p-3">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={translate(
              'auto.components.ClickUpTaskWorkspace.replyPlaceholder',
              'Write a reply'
            )}
            className="min-h-20 w-full resize-y bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-2 flex justify-end">
            <Button
              type="button"
              size="sm"
              className="gap-2"
              disabled={!hasBoundedCommentBodyText(draft) || submitting}
              onClick={() => void handleSubmit()}
            >
              {submitting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {translate('auto.components.ClickUpTaskWorkspace.reply', 'Reply')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
