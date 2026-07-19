import { Flag } from 'lucide-react'
import type { ReactNode } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

export type ClickUpCreateTaskOption = {
  value: string
  label: string
  color?: string
}

export type ClickUpCreateTaskTagOption = {
  name: string
  color?: string
}

function OptionDot({ color }: { color?: string }): React.JSX.Element | null {
  return color ? (
    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
  ) : null
}

export function ClickUpCreateTaskPropertySelect({
  label,
  value,
  options,
  fallbackValue,
  fallbackLabel,
  disabled,
  icon,
  optionMarker = 'dot',
  onValueChange
}: {
  label: string
  value: string
  options: ClickUpCreateTaskOption[]
  fallbackValue: string
  fallbackLabel: string
  disabled: boolean
  icon?: ReactNode
  optionMarker?: 'dot' | 'flag'
  onValueChange: (value: string) => void
}): React.JSX.Element {
  return (
    <div className="min-w-0 space-y-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value || fallbackValue} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className="w-full min-w-0" aria-label={label}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={fallbackValue}>
            <span className="inline-flex items-center gap-2">
              {icon}
              <span>{fallbackLabel}</span>
            </span>
          </SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="inline-flex min-w-0 items-center gap-2">
                {optionMarker === 'flag' ? (
                  <Flag className="size-3.5 shrink-0" style={{ color: option.color }} />
                ) : (
                  <OptionDot color={option.color} />
                )}
                <span>{option.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
