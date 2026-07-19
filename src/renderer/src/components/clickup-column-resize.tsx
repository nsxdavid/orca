import React from 'react'

import { cn } from '@/lib/utils'

export type ClickUpResizableColumn =
  | 'type'
  | 'status'
  | 'priority'
  | 'tags'
  | 'assignees'
  | 'updated'

type ResizeHandler = (
  column: ClickUpResizableColumn,
  event: React.PointerEvent<HTMLButtonElement>
) => void

export function ClickUpResizableHeaderCell({
  column,
  label,
  resizeLabel,
  active,
  onActiveColumnChange,
  onResizeStart
}: {
  column: ClickUpResizableColumn
  label: string
  resizeLabel: string
  active: boolean
  onActiveColumnChange: (column: ClickUpResizableColumn | null) => void
  onResizeStart: ResizeHandler
}): React.JSX.Element {
  return (
    <span className="group/resize-column relative min-w-0 pl-3">
      <span className="block truncate">{label}</span>
      <button
        type="button"
        aria-label={resizeLabel}
        className={cn(
          'absolute -left-2 top-1/2 h-6 w-4 -translate-y-1/2 cursor-col-resize rounded-sm before:absolute before:left-1/2 before:top-1 before:h-4 before:w-px before:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          active ? 'bg-accent before:bg-foreground/70' : 'before:bg-border/70 hover:bg-accent'
        )}
        onPointerEnter={() => onActiveColumnChange(column)}
        onPointerLeave={() => onActiveColumnChange(null)}
        onPointerDown={(event) => onResizeStart(column, event)}
      />
    </span>
  )
}

export function ClickUpColumnResizeRails({
  columns,
  gridTemplateColumns,
  labels,
  activeColumn,
  onActiveColumnChange,
  onResizeStart
}: {
  columns: ClickUpResizableColumn[]
  gridTemplateColumns: string
  labels: Record<ClickUpResizableColumn, string>
  activeColumn: ClickUpResizableColumn | null
  onActiveColumnChange: (column: ClickUpResizableColumn | null) => void
  onResizeStart: ResizeHandler
}): React.JSX.Element {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-20 hidden grid gap-3 px-3 md:grid"
      style={{ gridTemplateColumns }}
    >
      <span />
      {columns.map((column) => (
        <span key={column} className="relative min-w-0">
          <button
            type="button"
            aria-label={labels[column]}
            className={cn(
              'pointer-events-auto absolute -left-3 top-0 h-full w-6 cursor-col-resize rounded-sm before:absolute before:left-1/2 before:top-0 before:h-full before:w-px before:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              activeColumn === column
                ? 'bg-accent/25 before:bg-foreground/45'
                : 'before:bg-transparent'
            )}
            onPointerEnter={() => onActiveColumnChange(column)}
            onPointerLeave={() => onActiveColumnChange(null)}
            onPointerDown={(event) => onResizeStart(column, event)}
          />
        </span>
      ))}
      <span />
    </div>
  )
}
