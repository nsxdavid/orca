import { describe, expect, it } from 'vitest'

import { orderClickUpCommentsOldestFirst } from './clickup-comment-order'

describe('orderClickUpCommentsOldestFirst', () => {
  it('places the oldest comment at the top regardless of API order', () => {
    const ordered = orderClickUpCommentsOldestFirst([
      { id: 'newest', body: 'Newest', createdAt: '2026-07-10T18:00:00.000Z' },
      { id: 'oldest', body: 'Oldest', createdAt: '2026-06-15T18:00:00.000Z' },
      { id: 'middle', body: 'Middle', createdAt: '2026-07-03T18:00:00.000Z' }
    ])

    expect(ordered.map((comment) => comment.id)).toEqual(['oldest', 'middle', 'newest'])
  })
})
