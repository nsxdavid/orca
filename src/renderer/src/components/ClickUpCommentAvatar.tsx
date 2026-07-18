import React from 'react'

import { cn } from '@/lib/utils'
import type { ClickUpComment, ClickUpUser } from '../../../shared/types'

type ClickUpCommentAvatarProps = {
  user?: ClickUpUser
  comment?: ClickUpComment
  className?: string
}

export default function ClickUpCommentAvatar({
  user,
  comment,
  className
}: ClickUpCommentAvatarProps): React.JSX.Element {
  const displayedUser = user ?? comment?.user
  const name = displayedUser?.username ?? 'ClickUp user'
  if (displayedUser?.avatarUrl) {
    return (
      <img
        src={displayedUser.avatarUrl}
        alt={name}
        className={cn('size-6 shrink-0 rounded-full bg-muted object-cover', className)}
      />
    )
  }
  return (
    <span
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground',
        className
      )}
      aria-label={name}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}
