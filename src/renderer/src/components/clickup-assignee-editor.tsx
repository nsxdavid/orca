import { Check, LoaderCircle, UserRound } from 'lucide-react'
import { useMemo } from 'react'

import type { ClickUpTask, ClickUpUser } from '../../../shared/types'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { getClickUpAssigneeCandidates } from './clickup-assignee-selection'

function userName(user: ClickUpUser): string {
  return (
    user.username || user.email || translate('auto.components.TaskPage.clickupUser', 'ClickUp user')
  )
}

function UserAvatar({ user }: { user: ClickUpUser }): React.JSX.Element {
  const name = userName(user)
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={name}
          className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-background bg-muted text-[11px] font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            name.slice(0, 1).toUpperCase()
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {name}
      </TooltipContent>
    </Tooltip>
  )
}

export function ClickUpAssigneeAvatars({
  assignees,
  maxVisible = 5
}: {
  assignees: ClickUpUser[]
  maxVisible?: number
}): React.JSX.Element {
  const visible = assignees.slice(0, maxVisible)
  const hidden = assignees.slice(maxVisible)
  return (
    <span className="flex min-w-0 items-center -space-x-1.5">
      {visible.map((assignee) => (
        <UserAvatar key={assignee.id} user={assignee} />
      ))}
      {hidden.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="relative flex size-6 shrink-0 items-center justify-center rounded-full border border-background bg-muted text-[10px] font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
              +{hidden.length}
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={6}>
            {hidden.map(userName).join(', ')}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  )
}

export default function ClickUpAssigneeEditor({
  task,
  members,
  loading = false,
  error = null,
  updating = false,
  onToggle
}: {
  task: ClickUpTask
  members: ClickUpUser[]
  loading?: boolean
  error?: string | null
  updating?: boolean
  onToggle: (task: ClickUpTask, member: ClickUpUser) => void
}): React.JSX.Element {
  const candidates = useMemo(() => {
    return getClickUpAssigneeCandidates(members, task.assignees)
  }, [members, task.assignees])
  const selectedIds = useMemo(
    () => new Set(task.assignees.map((assignee) => assignee.id)),
    [task.assignees]
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={updating}
          className={cn(
            'flex min-h-7 w-full min-w-0 items-center justify-start rounded border border-transparent p-0.5 transition hover:border-border/70 data-[state=open]:border-ring data-[state=open]:bg-muted/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            updating && 'opacity-70'
          )}
          onClick={(event) => event.stopPropagation()}
          aria-label={translate('auto.components.TaskPage.clickupEditAssignees', 'Edit assignees')}
        >
          {task.assignees.length > 0 ? (
            <ClickUpAssigneeAvatars assignees={task.assignees} />
          ) : (
            <UserRound className="size-4 text-muted-foreground" />
          )}
          {updating ? <LoaderCircle className="ml-2 size-3 animate-spin" /> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 p-0"
        onClick={(event) => event.stopPropagation()}
      >
        <Command>
          <CommandInput
            placeholder={translate(
              'auto.components.TaskPage.clickupSearchAssignees',
              'Search members...'
            )}
          />
          <CommandList className="scrollbar-sleek">
            <CommandEmpty>
              {loading
                ? translate('auto.components.TaskPage.clickupLoadingMembers', 'Loading members...')
                : error ||
                  translate('auto.components.TaskPage.clickupNoMembers', 'No members found.')}
            </CommandEmpty>
            {candidates.map((member) => {
              const selected = selectedIds.has(member.id)
              const name = userName(member)
              return (
                <CommandItem
                  key={member.id}
                  value={`${name} ${member.email ?? ''}`}
                  disabled={updating}
                  onSelect={() => onToggle(task, member)}
                  className="gap-2"
                >
                  <UserAvatar user={member} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{name}</span>
                    {member.email ? (
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {member.email}
                      </span>
                    ) : null}
                  </span>
                  {selected ? <Check className="size-3.5 shrink-0" /> : null}
                </CommandItem>
              )
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
