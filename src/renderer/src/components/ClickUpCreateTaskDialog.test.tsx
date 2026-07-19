// @vitest-environment happy-dom

import '@testing-library/jest-dom/vitest'

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClickUpCreateTaskDialog from './ClickUpCreateTaskDialog'

afterEach(cleanup)

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof ClickUpCreateTaskDialog>> = {}
) {
  const props: React.ComponentProps<typeof ClickUpCreateTaskDialog> = {
    open: true,
    submitting: false,
    listOptions: [{ value: 'list-1', label: 'playerSense / Dev / Dev Board' }],
    statusOptions: [{ value: 'to do', label: 'TO DO', color: '#87909e' }],
    priorityOptions: [{ value: '1', label: 'Urgent', color: '#f87171' }],
    taskTypeOptions: [{ value: '1001', label: 'Feature', color: '#60a5fa' }],
    tagOptions: [
      { name: 'ready', color: '#22c55e' },
      { name: 'triage', color: '#ef4444' }
    ],
    listId: 'list-1',
    title: '',
    description: '',
    status: 'to do',
    priority: '',
    taskTypeId: '',
    tagNames: [],
    onOpenChange: vi.fn(),
    onListChange: vi.fn(),
    onTitleChange: vi.fn(),
    onDescriptionChange: vi.fn(),
    onStatusChange: vi.fn(),
    onPriorityChange: vi.fn(),
    onTaskTypeChange: vi.fn(),
    onTagNamesChange: vi.fn(),
    onSubmit: vi.fn(),
    ...overrides
  }
  render(<ClickUpCreateTaskDialog {...props} />)
  return props
}

describe('ClickUpCreateTaskDialog', () => {
  it('keeps task content primary and hides tag choices until requested', () => {
    renderDialog()

    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus()
    expect(screen.getByRole('textbox', { name: 'Description (optional)' })).toBeVisible()
    expect(screen.getByRole('button', { name: /Add tags/ })).toBeVisible()
    expect(screen.queryByText('ready')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create task/ })).toBeDisabled()
  })

  it('selects tags from a searchable picker', async () => {
    const user = userEvent.setup()
    const onTagNamesChange = vi.fn()
    renderDialog({ onTagNamesChange })

    await user.click(screen.getByRole('button', { name: /Add tags/ }))
    await user.type(screen.getByPlaceholderText('Search tags...'), 'ready')
    await user.click(screen.getByText('ready'))

    expect(onTagNamesChange).toHaveBeenCalledWith(['ready'])
  })
})
