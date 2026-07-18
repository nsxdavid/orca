// @vitest-environment happy-dom

import '@testing-library/jest-dom/vitest'

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ClickUpTask, ClickUpUser } from '../../../shared/types'
import { TooltipProvider } from '@/components/ui/tooltip'
import ClickUpAssigneeEditor from './clickup-assignee-editor'

afterEach(cleanup)

const ada: ClickUpUser = { id: '1', username: 'Ada' }
const grace: ClickUpUser = { id: '2', username: 'Grace' }
const task: ClickUpTask = {
  id: 'task-1',
  customId: null,
  listId: 'list-1',
  title: 'Test task',
  url: 'https://app.clickup.com/t/task-1',
  status: { status: 'open' },
  assignees: [ada],
  tags: [],
  parentId: null,
  subtaskCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  closedAt: null
}

describe('ClickUpAssigneeEditor', () => {
  it('uses avatar-only display with a name tooltip', async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider delayDuration={0}>
        <ClickUpAssigneeEditor task={task} members={[ada, grace]} onToggle={vi.fn()} />
      </TooltipProvider>
    )

    expect(screen.getByRole('button', { name: 'Edit assignees' })).not.toHaveTextContent('Ada')
    await user.hover(screen.getByLabelText('Ada'))
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Ada')
  })

  it('selects a member from the searchable picker', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(
      <TooltipProvider>
        <ClickUpAssigneeEditor task={task} members={[ada, grace]} onToggle={onToggle} />
      </TooltipProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Edit assignees' }))
    await user.type(screen.getByPlaceholderText('Search members...'), 'Grace')
    await user.click(screen.getByText('Grace'))
    expect(onToggle).toHaveBeenCalledWith(task, grace)
  })
})
