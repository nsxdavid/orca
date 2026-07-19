import React, { useMemo } from 'react'
import { Check, ChevronDown, Flag, Loader2, Plus, Tag, X } from 'lucide-react'

import {
  ClickUpCreateTaskPropertySelect,
  type ClickUpCreateTaskOption,
  type ClickUpCreateTaskTagOption
} from './clickup-create-task-controls'
import { ClickUpIcon } from '@/components/icons/ClickUpIcon'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { isScreenSubmitShortcut } from '@/lib/screen-submit-shortcut'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'

type ClickUpCreateTaskDialogProps = {
  open: boolean
  submitting: boolean
  listOptions: ClickUpCreateTaskOption[]
  statusOptions: ClickUpCreateTaskOption[]
  priorityOptions: ClickUpCreateTaskOption[]
  taskTypeOptions: ClickUpCreateTaskOption[]
  tagOptions: ClickUpCreateTaskTagOption[]
  listId: string
  title: string
  description: string
  status: string
  priority: string
  taskTypeId: string
  tagNames: string[]
  onOpenChange: (open: boolean) => void
  onListChange: (listId: string) => void
  onTitleChange: (title: string) => void
  onDescriptionChange: (description: string) => void
  onStatusChange: (status: string) => void
  onPriorityChange: (priority: string) => void
  onTaskTypeChange: (taskTypeId: string) => void
  onTagNamesChange: (tagNames: string[]) => void
  onSubmit: () => void
}

function tagStyle(color: string | undefined): React.CSSProperties | undefined {
  if (!color) {
    return undefined
  }
  return {
    '--clickup-create-tag-color': color,
    backgroundColor: 'color-mix(in srgb, var(--clickup-create-tag-color) 14%, transparent)',
    borderColor: 'color-mix(in srgb, var(--clickup-create-tag-color) 34%, transparent)',
    color: 'color-mix(in srgb, var(--clickup-create-tag-color) 82%, var(--foreground))'
  } as React.CSSProperties
}

export default function ClickUpCreateTaskDialog({
  open,
  submitting,
  listOptions,
  statusOptions,
  priorityOptions,
  taskTypeOptions,
  tagOptions,
  listId,
  title,
  description,
  status,
  priority,
  taskTypeId,
  tagNames,
  onOpenChange,
  onListChange,
  onTitleChange,
  onDescriptionChange,
  onStatusChange,
  onPriorityChange,
  onTaskTypeChange,
  onTagNamesChange,
  onSubmit
}: ClickUpCreateTaskDialogProps): React.JSX.Element {
  const selectedTagNames = useMemo(
    () => new Set(tagNames.map((name) => name.toLowerCase())),
    [tagNames]
  )
  const selectedList = listOptions.find((option) => option.value === listId)
  const canSubmit = Boolean(listId && title.trim() && !submitting)

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!submitting) {
          onOpenChange(nextOpen)
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100vh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl"
        onKeyDown={(event) => {
          if (isScreenSubmitShortcut(event)) {
            event.preventDefault()
            if (canSubmit) {
              onSubmit()
            }
          }
        }}
      >
        <DialogHeader className="flex-row items-start justify-between gap-4 border-b border-border/60 px-6 py-4 text-left">
          <div className="flex min-w-0 items-start gap-3">
            <ClickUpIcon className="mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 space-y-1">
              <DialogTitle>
                {translate('auto.components.TaskPage.clickupNewTask', 'New ClickUp task')}
              </DialogTitle>
              <DialogDescription className="truncate text-xs">
                {selectedList
                  ? translate(
                      'auto.components.TaskPage.clickupCreateDescription',
                      'Creates a new task in {{value0}}.',
                      { value0: selectedList.label }
                    )
                  : translate(
                      'auto.components.TaskPage.clickupCreateChooseList',
                      'Choose a ClickUp list before creating the task.'
                    )}
              </DialogDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={translate('auto.components.ui.dialog.f26c4baeda', 'Close')}
            disabled={submitting}
            onClick={() => onOpenChange(false)}
            className="shrink-0 text-muted-foreground"
          >
            <X />
          </Button>
        </DialogHeader>

        <div className="scrollbar-sleek overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="clickup-create-title"
                className="text-xs font-medium text-muted-foreground"
              >
                {translate('auto.components.TaskPage.16cba35bee', 'Title')}
              </label>
              <Input
                id="clickup-create-title"
                autoFocus
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing && canSubmit) {
                    event.preventDefault()
                    onSubmit()
                  }
                }}
                placeholder={translate('auto.components.TaskPage.578f730c16', 'Short summary')}
                disabled={submitting}
                className="h-11 text-base font-medium"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="clickup-create-description"
                className="text-xs font-medium text-muted-foreground"
              >
                {translate('auto.components.TaskPage.f161bf9ede', 'Description (optional)')}
              </label>
              <textarea
                id="clickup-create-description"
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
                placeholder={translate('auto.components.TaskPage.34d97ca682', "What's going on?")}
                disabled={submitting}
                className="scrollbar-sleek min-h-32 max-h-64 w-full min-w-0 resize-y rounded-md border border-input bg-input/20 px-3 py-2.5 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>

            <div className="space-y-4 border-t border-border/60 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {translate('auto.components.TaskPage.clickupList', 'List')}
                </label>
                <Select
                  value={listId || undefined}
                  onValueChange={onListChange}
                  disabled={submitting}
                >
                  <SelectTrigger
                    className="w-full min-w-0"
                    aria-label={translate('auto.components.TaskPage.clickupList', 'List')}
                  >
                    <SelectValue
                      placeholder={translate('auto.components.TaskPage.clickupList', 'List')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {listOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="block whitespace-normal text-left">{option.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <ClickUpCreateTaskPropertySelect
                  label={translate('auto.components.TaskPage.154b0fa623', 'Status')}
                  value={status}
                  options={statusOptions}
                  fallbackValue="__none"
                  fallbackLabel={translate(
                    'auto.components.TaskPage.clickupDefaultStatus',
                    'Default'
                  )}
                  disabled={submitting}
                  onValueChange={(value) => onStatusChange(value === '__none' ? '' : value)}
                />
                <ClickUpCreateTaskPropertySelect
                  label={translate('auto.components.TaskPage.c8d5bec5f7', 'Priority')}
                  value={priority}
                  options={priorityOptions}
                  fallbackValue="__none"
                  fallbackLabel={translate('auto.components.TaskPage.713179dfdc', 'No priority')}
                  disabled={submitting}
                  icon={<Flag className="size-3.5 text-muted-foreground" />}
                  optionMarker="flag"
                  onValueChange={(value) => onPriorityChange(value === '__none' ? '' : value)}
                />
                <ClickUpCreateTaskPropertySelect
                  label={translate('auto.components.TaskPage.clickupTaskType', 'Type')}
                  value={taskTypeId}
                  options={taskTypeOptions}
                  fallbackValue="__default"
                  fallbackLabel={translate(
                    'auto.components.TaskPage.clickupDefaultTaskType',
                    'Default'
                  )}
                  disabled={submitting}
                  onValueChange={(value) => onTaskTypeChange(value === '__default' ? '' : value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {translate('auto.components.TaskPage.clickupTags', 'Tags')}
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={submitting || tagOptions.length === 0}
                      className="h-auto min-h-9 w-full min-w-0 justify-start gap-2 px-3 py-2 font-normal whitespace-normal"
                    >
                      <Tag className="size-3.5 shrink-0 text-muted-foreground" />
                      {tagNames.length === 0 ? (
                        <span className="text-muted-foreground">
                          {tagOptions.length === 0
                            ? translate(
                                'auto.components.TaskPage.clickupNoTagsAvailable',
                                'No tags are available for this space yet.'
                              )
                            : translate(
                                'auto.components.ClickUpCreateTaskDialog.addTags',
                                'Add tags'
                              )}
                        </span>
                      ) : (
                        <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                          {tagNames.map((name) => {
                            const tagOption = tagOptions.find(
                              (option) => option.name.toLowerCase() === name.toLowerCase()
                            )
                            return (
                              <span
                                key={name}
                                className="inline-flex shrink-0 whitespace-nowrap rounded border border-border/50 bg-muted/45 px-1.5 py-0.5 text-[11px]"
                                style={tagStyle(tagOption?.color)}
                              >
                                {name}
                              </span>
                            )
                          })}
                        </span>
                      )}
                      <ChevronDown className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={4}
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                  >
                    <Command>
                      <CommandInput
                        placeholder={translate(
                          'auto.components.ClickUpCreateTaskDialog.searchTags',
                          'Search tags...'
                        )}
                      />
                      <CommandList className="max-h-56">
                        <CommandEmpty>
                          {translate(
                            'auto.components.ClickUpCreateTaskDialog.noTagsFound',
                            'No tags found.'
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {tagOptions.map((option) => {
                            const selected = selectedTagNames.has(option.name.toLowerCase())
                            return (
                              <CommandItem
                                key={option.name}
                                value={option.name}
                                onSelect={() =>
                                  onTagNamesChange(
                                    selected
                                      ? tagNames.filter(
                                          (name) => name.toLowerCase() !== option.name.toLowerCase()
                                        )
                                      : [...tagNames, option.name]
                                  )
                                }
                              >
                                <span
                                  className="size-2 shrink-0 rounded-full bg-muted-foreground"
                                  style={
                                    option.color ? { backgroundColor: option.color } : undefined
                                  }
                                />
                                <span className="min-w-0 flex-1">{option.name}</span>
                                <Check
                                  className={cn(
                                    'size-3.5 shrink-0',
                                    selected ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted/10 px-6 py-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            {translate('auto.components.TaskPage.ff69a30681', 'Cancel')}
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            {submitting ? (
              <>
                <Loader2 className="animate-spin" />
                {translate('auto.components.TaskPage.8ff6fdc368', 'Creating…')}
              </>
            ) : (
              <>
                <Plus />
                {translate('auto.components.TaskPage.clickupCreateTask', 'Create task')}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
