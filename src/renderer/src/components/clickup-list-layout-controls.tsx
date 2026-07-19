import { Check, GitBranch, Layers3, Trash2 } from 'lucide-react'
import type { JSX } from 'react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'

export type ClickUpGrouping = 'none' | 'status' | 'priority' | 'type' | 'tag'
export type ClickUpGroupDirection = 'ascending' | 'descending'
export type ClickUpSubtaskMode = 'collapsed' | 'expanded' | 'separate'

type GroupingOption = {
  id: Exclude<ClickUpGrouping, 'none'>
  label: string
}

type SubtaskOption = {
  id: ClickUpSubtaskMode
  label: string
  description: string
}

function getGroupingOptions(): GroupingOption[] {
  return [
    {
      id: 'status',
      label: translate('auto.components.ClickUpListLayoutControls.status', 'Status')
    },
    {
      id: 'priority',
      label: translate('auto.components.ClickUpListLayoutControls.priority', 'Priority')
    },
    {
      id: 'type',
      label: translate('auto.components.ClickUpListLayoutControls.type', 'Type')
    },
    {
      id: 'tag',
      label: translate('auto.components.ClickUpListLayoutControls.tags', 'Tags')
    }
  ]
}

function getSubtaskOptions(): SubtaskOption[] {
  return [
    {
      id: 'collapsed',
      label: translate('auto.components.ClickUpListLayoutControls.collapsed', 'Collapsed'),
      description: translate(
        'auto.components.ClickUpListLayoutControls.collapsedDescription',
        'Subtasks stay nested and start hidden.'
      )
    },
    {
      id: 'expanded',
      label: translate('auto.components.ClickUpListLayoutControls.expanded', 'Expanded'),
      description: translate(
        'auto.components.ClickUpListLayoutControls.expandedDescription',
        'Subtasks stay nested and start visible.'
      )
    },
    {
      id: 'separate',
      label: translate('auto.components.ClickUpListLayoutControls.separate', 'Separate'),
      description: translate(
        'auto.components.ClickUpListLayoutControls.separateDescription',
        'Show subtasks as independent rows.'
      )
    }
  ]
}

function ClickUpGroupByControl(props: {
  grouping: ClickUpGrouping
  direction: ClickUpGroupDirection
  onGroupingChange: (grouping: ClickUpGrouping) => void
  onDirectionChange: (direction: ClickUpGroupDirection) => void
}): JSX.Element {
  const groupingOptions = getGroupingOptions()
  const groupingLabel =
    groupingOptions.find((option) => option.id === props.grouping)?.label ??
    translate('auto.components.ClickUpListLayoutControls.groupBy', 'Group by')

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 border-border/50 bg-transparent px-2 text-xs hover:bg-muted/50',
            props.grouping !== 'none' &&
              'border-primary/45 bg-primary/10 text-primary hover:border-primary/55 hover:bg-primary/15 dark:border-primary/45 dark:bg-primary/10 dark:hover:bg-primary/15'
          )}
          aria-label={translate(
            'auto.components.ClickUpListLayoutControls.groupByValue',
            'Group by: {{value0}}',
            { value0: groupingLabel }
          )}
        >
          <Layers3 className="size-3.5" />
          {groupingLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-3">
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          {translate('auto.components.ClickUpListLayoutControls.groupBy', 'Group by')}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={props.grouping === 'none' ? '' : props.grouping}
            onValueChange={(value) => props.onGroupingChange(value as ClickUpGrouping)}
          >
            <SelectTrigger size="sm" className="min-w-0 flex-1 bg-background text-xs">
              <SelectValue
                placeholder={translate(
                  'auto.components.ClickUpListLayoutControls.selectProperty',
                  'Select property'
                )}
              />
            </SelectTrigger>
            <SelectContent>
              {groupingOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={props.direction}
            onValueChange={(value) => props.onDirectionChange(value as ClickUpGroupDirection)}
            disabled={props.grouping === 'none'}
          >
            <SelectTrigger size="sm" className="w-[132px] bg-background text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ascending">
                {translate('auto.components.ClickUpListLayoutControls.ascending', 'Ascending')}
              </SelectItem>
              <SelectItem value="descending">
                {translate('auto.components.ClickUpListLayoutControls.descending', 'Descending')}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={props.grouping === 'none'}
            onClick={() => props.onGroupingChange('none')}
            aria-label={translate(
              'auto.components.ClickUpListLayoutControls.clearGrouping',
              'Clear grouping'
            )}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function ClickUpSubtaskControl(props: {
  mode: ClickUpSubtaskMode
  onModeChange: (mode: ClickUpSubtaskMode) => void
}): JSX.Element {
  const options = getSubtaskOptions()
  const selected = options.find((option) => option.id === props.mode) ?? options[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 border-border/50 bg-transparent px-2 text-xs hover:bg-muted/50',
            props.mode !== 'collapsed' &&
              'border-primary/45 bg-primary/10 text-primary hover:border-primary/55 hover:bg-primary/15 dark:border-primary/45 dark:bg-primary/10 dark:hover:bg-primary/15'
          )}
          aria-label={translate(
            'auto.components.ClickUpListLayoutControls.showSubtasksValue',
            'Show subtasks: {{value0}}',
            { value0: selected.label }
          )}
        >
          <GitBranch className="size-3.5" />
          {selected.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs">
          {translate('auto.components.ClickUpListLayoutControls.showSubtasks', 'Show subtasks')}
        </DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuItem
            key={option.id}
            className="justify-between py-1.5 text-sm"
            onSelect={() => props.onModeChange(option.id)}
          >
            <span>
              {option.label}
              {option.id === 'collapsed' ? (
                <span className="ml-2 font-normal text-muted-foreground">
                  {translate('auto.components.ClickUpListLayoutControls.default', '(default)')}
                </span>
              ) : null}
            </span>
            {option.id === props.mode ? <Check className="size-4 text-foreground" /> : null}
          </DropdownMenuItem>
        ))}
        <p className="px-2 pt-1 pb-0.5 text-xs leading-5 text-muted-foreground">
          {selected.description}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ClickUpListLayoutControls(props: {
  grouping: ClickUpGrouping
  groupDirection: ClickUpGroupDirection
  subtaskMode: ClickUpSubtaskMode
  groupingEnabled: boolean
  onGroupingChange: (grouping: ClickUpGrouping) => void
  onGroupDirectionChange: (direction: ClickUpGroupDirection) => void
  onSubtaskModeChange: (mode: ClickUpSubtaskMode) => void
}): JSX.Element {
  return (
    <>
      {/* Why: ClickUp treats grouping and subtask presentation as independent list settings. */}
      {props.groupingEnabled ? (
        <ClickUpGroupByControl
          grouping={props.grouping}
          direction={props.groupDirection}
          onGroupingChange={props.onGroupingChange}
          onDirectionChange={props.onGroupDirectionChange}
        />
      ) : null}
      <ClickUpSubtaskControl mode={props.subtaskMode} onModeChange={props.onSubtaskModeChange} />
    </>
  )
}
