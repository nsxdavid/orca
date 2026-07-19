import { describe, expect, it } from 'vitest'
import { isClickUpColdRefreshGesture } from './clickup-refresh-gesture'

describe('ClickUp refresh gesture', () => {
  it('uses Control on Windows and Linux', () => {
    expect(isClickUpColdRefreshGesture({ ctrlKey: true, metaKey: false }, 'Windows')).toBe(true)
    expect(isClickUpColdRefreshGesture({ ctrlKey: false, metaKey: true }, 'Windows')).toBe(false)
  })

  it('uses Command on macOS', () => {
    expect(isClickUpColdRefreshGesture({ ctrlKey: false, metaKey: true }, 'Macintosh')).toBe(true)
    expect(isClickUpColdRefreshGesture({ ctrlKey: true, metaKey: false }, 'Macintosh')).toBe(false)
  })

  it('keeps an unmodified click warm', () => {
    expect(isClickUpColdRefreshGesture({ ctrlKey: false, metaKey: false }, 'Windows')).toBe(false)
  })
})
