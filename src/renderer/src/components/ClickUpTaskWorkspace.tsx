import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Clipboard,
  ExternalLink,
  GitBranch,
  Link,
  LoaderCircle,
  X
} from 'lucide-react'
import { toast } from 'sonner'

import ClickUpTaskCommentThread from '@/components/ClickUpTaskCommentThread'
import { ClickUpIcon } from '@/components/icons/ClickUpIcon'
import CommentMarkdown from '@/components/sidebar/CommentMarkdown'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  buildClickUpBranchName,
  buildClickUpPrompt,
  formatClickUpRelativeTime,
  getClickUpTaskIdentifier
} from '@/components/clickup-task-workspace-text'
import { translate } from '@/i18n/i18n'
import type { ClickUpComment, ClickUpTask } from '../../../shared/types'
import type { TaskSourceContext } from '../../../shared/task-source-context'

type ClickUpTaskWorkspaceProps = {
  task: ClickUpTask | null
  loading?: boolean
  error?: string | null
  propertySection?: React.ReactNode
  onUse: (task: ClickUpTask) => void
  onClose: () => void
  variant?: 'pane' | 'page'
  backLabel?: string
  sourceContext?: TaskSourceContext | null
  workspaceId?: string | null
  activityRefreshNonce?: number
}

async function copyTextToClipboard(text: string, label: string): Promise<boolean> {
  try {
    await window.api.ui.writeClipboardText(text)
    toast.success(
      translate('auto.components.ClickUpTaskWorkspace.copied', '{{value0}} copied', {
        value0: label
      })
    )
    return true
  } catch {
    toast.error(
      translate('auto.components.ClickUpTaskWorkspace.copyFailed', 'Failed to copy {{value0}}', {
        value0: label.toLowerCase()
      })
    )
    return false
  }
}

function ClickUpTaskWorkspaceEmpty(): React.JSX.Element {
  return (
    <div className="flex h-full min-h-0 items-center justify-center border-l border-border/60 bg-background p-8 text-center">
      <div className="max-w-sm">
        <ClickUpIcon className="mx-auto mb-3 size-8 text-muted-foreground/60" />
        <p className="text-sm font-medium text-foreground">
          {translate('auto.components.ClickUpTaskWorkspace.selectTask', 'Select a ClickUp task')}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {translate(
            'auto.components.ClickUpTaskWorkspace.selectTaskBody',
            'Inspect a task before starting a workspace.'
          )}
        </p>
      </div>
    </div>
  )
}

export default function ClickUpTaskWorkspace({
  task,
  loading = false,
  error = null,
  propertySection,
  onUse,
  onClose,
  variant = 'pane',
  backLabel = 'Back',
  sourceContext,
  workspaceId,
  activityRefreshNonce = 0
}: ClickUpTaskWorkspaceProps): React.JSX.Element {
  const [comments, setComments] = useState<ClickUpComment[]>([])
  const [identifierCopied, setIdentifierCopied] = useState(false)
  const identifierCopyResetTimerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (identifierCopyResetTimerRef.current !== null) {
        window.clearTimeout(identifierCopyResetTimerRef.current)
      }
    },
    []
  )

  const handleCopyIdentifier = useCallback(async (): Promise<void> => {
    if (!task) {
      return
    }
    const copied = await copyTextToClipboard(getClickUpTaskIdentifier(task), 'ID')
    if (!copied) {
      return
    }
    setIdentifierCopied(true)
    if (identifierCopyResetTimerRef.current !== null) {
      window.clearTimeout(identifierCopyResetTimerRef.current)
    }
    identifierCopyResetTimerRef.current = window.setTimeout(() => {
      setIdentifierCopied(false)
      identifierCopyResetTimerRef.current = null
    }, 1600)
  }, [task])

  const actionItems = useMemo(() => {
    if (!task) {
      return []
    }
    return [
      {
        label: translate('auto.components.ClickUpTaskWorkspace.open', 'Open'),
        icon: ExternalLink,
        action: () => void window.api.shell.openUrl(task.url)
      },
      {
        label: translate('auto.components.ClickUpTaskWorkspace.copyUrl', 'Copy URL'),
        icon: Link,
        action: () => void copyTextToClipboard(task.url, 'URL')
      },
      {
        label: translate('auto.components.ClickUpTaskWorkspace.copyBranch', 'Copy branch seed'),
        icon: GitBranch,
        action: () => void copyTextToClipboard(buildClickUpBranchName(task), 'Branch seed')
      },
      {
        label: translate('auto.components.ClickUpTaskWorkspace.copyPrompt', 'Copy prompt'),
        icon: Clipboard,
        action: () => void copyTextToClipboard(buildClickUpPrompt(task, comments), 'Prompt')
      }
    ]
  }, [comments, task])

  if (!task) {
    return <ClickUpTaskWorkspaceEmpty />
  }

  const description = task.markdownDescription || task.description || ''
  const identifier = getClickUpTaskIdentifier(task)
  const copyIdentifierLabel = identifierCopied
    ? translate('auto.components.ClickUpTaskWorkspace.copied', '{{value0}} copied', {
        value0: 'ID'
      })
    : translate('auto.components.ClickUpTaskWorkspace.copyId', 'Copy ID')
  const identifierControl = (
    <div className="flex min-w-0 items-center gap-0.5">
      <button
        type="button"
        onClick={() => void handleCopyIdentifier()}
        className="min-w-0 truncate rounded px-1 py-0.5 font-mono text-xs text-muted-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={copyIdentifierLabel}
      >
        {identifier}
      </button>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0"
            onClick={() => void handleCopyIdentifier()}
            aria-label={copyIdentifierLabel}
          >
            {identifierCopied ? <Check className="size-3" /> : <Clipboard className="size-3" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {copyIdentifierLabel}
        </TooltipContent>
      </Tooltip>
    </div>
  )

  if (variant === 'page') {
    return (
      <div className="h-full min-h-0 overflow-hidden rounded-md border border-border/50 bg-background shadow-sm">
        {/* ClickUp task context and activity stay visible as independently scrolling panes. */}
        <div className="grid h-full min-h-0 grid-cols-1 grid-rows-2 md:grid-cols-[minmax(0,1fr)_minmax(340px,38%)] md:grid-rows-1">
          <section className="flex min-h-0 min-w-0 flex-col">
            <header className="flex h-14 flex-none items-center justify-between gap-3 border-b border-border/60 px-4">
              <div className="flex min-w-0 items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="-ml-2 shrink-0 gap-1.5"
                  aria-label={backLabel}
                >
                  <ChevronLeft className="size-4" />
                  {backLabel}
                </Button>
                <div className="h-5 w-px shrink-0 bg-border/60" aria-hidden />
                <ClickUpIcon className="size-4 shrink-0 text-muted-foreground" />
                {identifierControl}
                {loading ? <LoaderCircle className="size-3.5 shrink-0 animate-spin" /> : null}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {actionItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Tooltip key={item.label}>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={item.action}
                          aria-label={item.label}
                        >
                          <Icon className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={6}>
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
                <Button onClick={() => onUse(task)} className="ml-1 shrink-0 gap-2" size="sm">
                  {translate('auto.components.ClickUpTaskWorkspace.start', 'Start workspace')}
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </header>

            <main className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[960px] px-7 py-8 lg:px-10 lg:py-10">
                {error ? (
                  <div className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {error}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {task.customItemName ? <span>{task.customItemName}</span> : null}
                  <span>{formatClickUpRelativeTime(task.updatedAt)}</span>
                </div>
                <h1 className="mt-2 text-2xl font-semibold leading-tight text-foreground">
                  {task.title}
                </h1>

                {propertySection ? (
                  <div className="mt-6 flex flex-wrap items-center gap-2">{propertySection}</div>
                ) : null}

                <section className="mt-8 border-t border-border/60 pt-7">
                  <h2 className="text-sm font-semibold text-foreground">
                    {translate('auto.components.ClickUpTaskWorkspace.description', 'Description')}
                  </h2>
                  {description ? (
                    <div className="mt-4 text-sm leading-7 text-foreground">
                      <CommentMarkdown content={description} variant="document" />
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">
                      {translate(
                        'auto.components.ClickUpTaskWorkspace.noDescription',
                        'No description provided.'
                      )}
                    </p>
                  )}
                </section>
              </div>
            </main>
          </section>

          <aside className="min-h-0 overflow-hidden border-t border-border/60 md:border-l md:border-t-0">
            <ClickUpTaskCommentThread
              task={task}
              workspaceId={workspaceId}
              sourceContext={sourceContext}
              onCommentsChange={setComments}
              layout="panel"
              refreshNonce={activityRefreshNonce}
            />
          </aside>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border-l border-border/60 bg-background">
      <header className="flex flex-none items-start gap-3 border-b border-border/60 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            {identifierControl}
            {task.customItemName ? <span>{task.customItemName}</span> : null}
            <span>{formatClickUpRelativeTime(task.updatedAt)}</span>
            {loading ? <LoaderCircle className="size-3 animate-spin" /> : null}
          </div>
          <h2 className="mt-1 text-[20px] font-semibold leading-tight text-foreground">
            {task.title}
          </h2>
          {propertySection ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">{propertySection}</div>
          ) : null}
        </div>
        <Button
          onClick={() => onUse(task)}
          className="hidden shrink-0 gap-2 sm:inline-flex"
          size="sm"
        >
          {translate('auto.components.ClickUpTaskWorkspace.start', 'Start workspace')}
          <ArrowRight className="size-4" />
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              onClick={onClose}
              aria-label={translate('auto.components.ClickUpTaskWorkspace.close', 'Close')}
            >
              <X className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={6}>
            {translate('auto.components.ClickUpTaskWorkspace.close', 'Close')}
          </TooltipContent>
        </Tooltip>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2.5">
        {actionItems.map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.label}
              type="button"
              variant="outline"
              size="xs"
              className="gap-1.5"
              onClick={item.action}
            >
              <Icon className="size-3.5" />
              {item.label}
            </Button>
          )
        })}
      </div>

      <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {error ? (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        ) : null}

        <section className="max-w-[760px]">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground">
            {translate('auto.components.ClickUpTaskWorkspace.description', 'Description')}
          </h3>
          {description ? (
            <div className="mt-3 text-sm text-foreground">
              <CommentMarkdown content={description} variant="document" />
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {translate(
                'auto.components.ClickUpTaskWorkspace.noDescription',
                'No description provided.'
              )}
            </p>
          )}
        </section>

        <ClickUpTaskCommentThread
          task={task}
          workspaceId={workspaceId}
          sourceContext={sourceContext}
          onCommentsChange={setComments}
          refreshNonce={activityRefreshNonce}
        />
      </div>
    </div>
  )
}
