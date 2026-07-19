import { translate } from '@/i18n/i18n'
import { buildContainedLinkedContextBlock } from '@/lib/linked-work-item-context'
import type { ClickUpComment, ClickUpTask } from '../../../shared/types'

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

export function getClickUpTaskIdentifier(task: ClickUpTask): string {
  return task.customId || task.id
}

export function formatClickUpRelativeTime(input: string | null | undefined): string {
  if (!input) {
    return translate('auto.components.ClickUpTaskWorkspace.noDate', 'No date')
  }
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) {
    return translate('auto.components.ClickUpTaskWorkspace.recently', 'recently')
  }
  const diffMinutes = Math.round((date.getTime() - Date.now()) / 60_000)
  if (Math.abs(diffMinutes) < 60) {
    return relativeFormatter.format(diffMinutes, 'minute')
  }
  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return relativeFormatter.format(diffHours, 'hour')
  }
  return relativeFormatter.format(Math.round(diffHours / 24), 'day')
}

export function buildClickUpBranchName(task: ClickUpTask): string {
  const identifier = getClickUpTaskIdentifier(task)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const slug = task.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 52)
  return `${identifier}${slug ? `-${slug}` : ''}`
}

export function buildClickUpPrompt(task: ClickUpTask, comments: readonly ClickUpComment[]): string {
  const identifier = getClickUpTaskIdentifier(task)
  const lines = [
    `ClickUp task: ${identifier}`,
    `Title: ${task.title}`,
    task.status?.status ? `Status: ${task.status.status}` : null,
    task.priority?.priority ? `Priority: ${task.priority.priority}` : null,
    task.customItemName ? `Type: ${task.customItemName}` : null,
    task.tags.length > 0 ? `Tags: ${task.tags.map((tag) => tag.name).join(', ')}` : null,
    task.url ? `URL: ${task.url}` : null,
    '',
    'Description:',
    task.markdownDescription || task.description || '(none)'
  ].filter((line): line is string => line !== null)
  if (comments.length > 0) {
    lines.push('', 'Comments:')
    for (const comment of comments) {
      lines.push(
        `- ${comment.user?.username ?? 'Someone'} (${formatClickUpRelativeTime(
          comment.createdAt
        )}): ${comment.body}`
      )
    }
  }
  const renderedText = lines.join('\n')
  return (
    buildContainedLinkedContextBlock({
      provider: 'clickup',
      version: 1,
      renderedText
    }) ?? renderedText
  )
}
