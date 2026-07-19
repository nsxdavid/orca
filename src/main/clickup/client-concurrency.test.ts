import { describe, expect, it } from 'vitest'

import { acquire, ClickUpApiError, isAuthError, release } from './client'

describe('ClickUp request concurrency', () => {
  it('starts queued interactive reads before background reads', async () => {
    await Promise.all([acquire(), acquire(), acquire(), acquire()])
    const order: string[] = []
    const background = acquire().then(() => order.push('background'))
    const interactive = acquire('interactive').then(() => order.push('interactive'))

    release()
    await interactive
    expect(order).toEqual(['interactive'])

    release()
    await background
    expect(order).toEqual(['interactive', 'background'])

    release()
    release()
    release()
    release()
  })

  it('distinguishes invalid credentials from permission failures', () => {
    expect(isAuthError(new ClickUpApiError('Invalid token', 401))).toBe(true)
    expect(isAuthError(new ClickUpApiError('Forbidden resource', 403))).toBe(false)
  })
})
