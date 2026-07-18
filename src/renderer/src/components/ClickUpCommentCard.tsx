import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LoaderCircle, MessageSquare } from 'lucide-react'

import ClickUpCommentAvatar from '@/components/ClickUpCommentAvatar'
import { orderClickUpCommentsOldestFirst } from '@/components/clickup-comment-order'
import CommentMarkdown from '@/components/sidebar/CommentMarkdown'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatClickUpRelativeTime } from '@/components/clickup-task-workspace-text'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import type { ClickUpComment, ClickUpUser } from '../../../shared/types'
import type { TaskSourceContext } from '../../../shared/task-source-context'

type ClickUpCommentCardProps = {
  comment: ClickUpComment
  layout: 'inline' | 'panel'
  onOpenThread: (comment: ClickUpComment, replies: ClickUpComment[]) => void
  sourceContext?: TaskSourceContext | null
  workspaceId?: string | null
}

function getReplyParticipants(replies: ClickUpComment[]): ClickUpUser[] {
  const users = new Map<string, ClickUpUser>()
  for (const reply of replies) {
    if (reply.user && !users.has(reply.user.id)) {
      users.set(reply.user.id, reply.user)
    }
  }
  return [...users.values()]
}

function ReplyParticipantAvatars({ users }: { users: ClickUpUser[] }): React.JSX.Element | null {
  if (users.length === 0) {
    return null
  }
  return (
    <span className="ml-1 flex shrink-0 -space-x-1.5">
      {users.slice(0, 3).map((user) => (
        <Tooltip key={user.id}>
          <TooltipTrigger asChild>
            <span className="rounded-full">
              <ClickUpCommentAvatar user={user} className="size-5 border border-background" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            {user.username}
          </TooltipContent>
        </Tooltip>
      ))}
    </span>
  )
}

export default function ClickUpCommentCard({
  comment,
  layout,
  onOpenThread,
  sourceContext,
  workspaceId
}: ClickUpCommentCardProps): React.JSX.Element {
  const fetchReplies = useAppStore((state) => state.fetchClickUpCommentReplies)
  const [replies, setReplies] = useState<ClickUpComment[]>([])
  const [loading, setLoading] = useState(false)
  const requestIdRef = useRef(0)

  const loadReplies = useCallback(
    async (force = false): Promise<ClickUpComment[]> => {
      requestIdRef.current += 1
      const requestId = requestIdRef.current
      setLoading(true)
      try {
        const nextReplies = orderClickUpCommentsOldestFirst(
          await fetchReplies(comment.id, workspaceId, { force, sourceContext })
        )
        if (requestId === requestIdRef.current) {
          setReplies(nextReplies)
        }
        return nextReplies
      } catch {
        return []
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [comment.id, fetchReplies, sourceContext, workspaceId]
  )

  useEffect(() => {
    requestIdRef.current += 1
    setReplies([])
    if (comment.replyCount === undefined || comment.replyCount > 0) {
      void loadReplies()
    }
  }, [comment.id, comment.replyCount, loadReplies])

  const openThread = useCallback(async (): Promise<void> => {
    const currentReplies = replies.length > 0 ? replies : await loadReplies(true)
    onOpenThread(comment, currentReplies)
  }, [comment, loadReplies, onOpenThread, replies])

  const replyCount = Math.max(comment.replyCount ?? 0, replies.length)
  const replyCountLabel =
    replyCount === 1
      ? translate('auto.components.ClickUpTaskWorkspace.oneReply', '1 reply')
      : translate('auto.components.ClickUpTaskWorkspace.replyCount', '{{value0}} replies', {
          value0: replyCount
        })
  const participants = useMemo(() => getReplyParticipants(replies), [replies])

  return (
    <article
      className={cn(layout === 'panel' && 'rounded-md border border-border/60 bg-card shadow-xs')}
    >
      <div className={cn('flex gap-3', layout === 'panel' && 'p-3')}>
        <ClickUpCommentAvatar comment={comment} />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-baseline gap-2">
            <span className="text-xs font-medium text-foreground">
              {comment.user?.username ??
                translate('auto.components.ClickUpTaskWorkspace.someone', 'Someone')}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formatClickUpRelativeTime(comment.createdAt)}
            </span>
          </div>
          <CommentMarkdown
            content={comment.body}
            variant="document"
            className="text-sm text-foreground"
          />
        </div>
      </div>

      <div
        className={cn(
          'flex items-center justify-between gap-2 text-xs text-muted-foreground',
          layout === 'panel' ? 'border-t border-border/50 px-3 py-2' : 'ml-9 mt-2'
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="gap-1.5"
          onClick={() => void openThread()}
        >
          <MessageSquare className="size-3.5" />
          {translate('auto.components.ClickUpTaskWorkspace.reply', 'Reply')}
        </Button>
        {replyCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="gap-1.5"
            onClick={() => void openThread()}
            disabled={loading}
          >
            {loading ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
            <span>{replyCountLabel}</span>
            <ReplyParticipantAvatars users={participants} />
          </Button>
        ) : null}
      </div>
    </article>
  )
}
