import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetClickUpRequestSchedulerForTests, runClickUpRequest } from './request-scheduler'

describe('ClickUp request scheduler', () => {
  beforeEach(() => {
    resetClickUpRequestSchedulerForTests()
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('retries transient GET failures', async () => {
    const request = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response('{}', { status: 200 }))

    const result = runClickUpRequest('token', 'GET', request)
    await vi.runAllTimersAsync()

    await expect(result).resolves.toMatchObject({ status: 200 })
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('does not retry mutations', async () => {
    const request = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 503 }))

    await expect(runClickUpRequest('token', 'POST', request)).resolves.toMatchObject({
      status: 503
    })
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('waits for the server reset before spending another token slot', async () => {
    vi.setSystemTime(new Date('2026-07-13T00:00:00.000Z'))
    const resetAt = (Date.now() + 1_000) / 1_000
    await runClickUpRequest('token', 'GET', () =>
      Promise.resolve(
        new Response('{}', {
          status: 200,
          headers: {
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(resetAt)
          }
        })
      )
    )
    const request = vi.fn<() => Promise<Response>>().mockResolvedValue(new Response('{}'))

    const pending = runClickUpRequest('token', 'GET', request)
    await vi.advanceTimersByTimeAsync(999)
    expect(request).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    await expect(pending).resolves.toMatchObject({ status: 200 })
    expect(request).toHaveBeenCalledTimes(1)
  })
})
