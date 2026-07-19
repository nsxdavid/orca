import { describe, expect, it } from 'vitest'

import { getClickUpResizedColumnWidth } from './clickup-column-width'

describe('getClickUpResizedColumnWidth', () => {
  it('widens a right-anchored property column when its left edge moves left', () => {
    expect(
      getClickUpResizedColumnWidth({
        startWidth: 120,
        startX: 400,
        currentX: 360,
        minWidth: 80,
        maxWidth: 640
      })
    ).toBe(160)
  })

  it('narrows a right-anchored property column when its left edge moves right', () => {
    expect(
      getClickUpResizedColumnWidth({
        startWidth: 120,
        startX: 400,
        currentX: 430,
        minWidth: 80,
        maxWidth: 640
      })
    ).toBe(90)
  })

  it('clamps resized columns to their allowed range', () => {
    expect(
      getClickUpResizedColumnWidth({
        startWidth: 120,
        startX: 400,
        currentX: 500,
        minWidth: 80,
        maxWidth: 640
      })
    ).toBe(80)
    expect(
      getClickUpResizedColumnWidth({
        startWidth: 120,
        startX: 400,
        currentX: -400,
        minWidth: 80,
        maxWidth: 640
      })
    ).toBe(640)
  })
})
