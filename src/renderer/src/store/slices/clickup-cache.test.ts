import { describe, expect, it, vi } from 'vitest'

import { cachedRead, type ClickUpReadScope } from './clickup-cache'

const EXPLICIT_SCOPE: ClickUpReadScope = {
  settings: null,
  contextKey: 'test-context',
  cachePrefix: 'test-context',
  explicitSource: true,
  force: false
}

describe('ClickUp cached reads', () => {
  it('cleans up a rejected read without creating an unhandled rejection', async () => {
    const unhandled: unknown[] = []
    const onUnhandled = (reason: unknown): void => {
      unhandled.push(reason)
    }
    process.on('unhandledRejection', onUnhandled)
    const read = vi
      .fn<() => Promise<number>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(42)

    try {
      await expect(
        cachedRead('rejected-read', EXPLICIT_SCOPE, {}, vi.fn(), read, () => null)
      ).rejects.toThrow('offline')
      await new Promise<void>((resolve) => setImmediate(resolve))

      expect(unhandled).toEqual([])
      await expect(
        cachedRead('rejected-read', EXPLICIT_SCOPE, {}, vi.fn(), read, () => null)
      ).resolves.toBe(42)
      expect(read).toHaveBeenCalledTimes(2)
    } finally {
      process.off('unhandledRejection', onUnhandled)
    }
  })
})
