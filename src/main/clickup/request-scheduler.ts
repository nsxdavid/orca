const DEFAULT_RATE_LIMIT = 100
const RATE_WINDOW_MS = 60_000
const MAX_GET_ATTEMPTS = 2

type TokenBudget = {
  limit: number
  remaining: number
  resetAt: number
}

const tokenBudgets = new Map<string, TokenBudget>()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseHeaderNumber(response: Response, name: string): number | undefined {
  const header = response.headers.get(name)
  if (header === null || header.trim() === '') {
    return undefined
  }
  const value = Number(header)
  return Number.isFinite(value) ? value : undefined
}

function budgetFor(token: string, now = Date.now()): TokenBudget {
  const current = tokenBudgets.get(token)
  if (!current || now >= current.resetAt) {
    const limit = current?.limit ?? DEFAULT_RATE_LIMIT
    const next = { limit, remaining: limit, resetAt: now + RATE_WINDOW_MS }
    tokenBudgets.set(token, next)
    return next
  }
  return current
}

async function reserveRateSlot(token: string): Promise<void> {
  while (true) {
    const now = Date.now()
    const budget = budgetFor(token, now)
    if (budget.remaining > 0) {
      budget.remaining -= 1
      return
    }
    await sleep(Math.max(25, budget.resetAt - now))
  }
}

function updateBudgetFromResponse(token: string, response: Response): void {
  const budget = budgetFor(token)
  const limit = parseHeaderNumber(response, 'X-RateLimit-Limit')
  const remaining = parseHeaderNumber(response, 'X-RateLimit-Remaining')
  const resetSeconds = parseHeaderNumber(response, 'X-RateLimit-Reset')
  if (limit !== undefined && limit > 0) {
    budget.limit = limit
  }
  if (remaining !== undefined && remaining >= 0) {
    budget.remaining = remaining
  }
  if (resetSeconds !== undefined && resetSeconds > 0) {
    budget.resetAt = resetSeconds * 1_000
  }
  if (response.status === 429) {
    budget.remaining = 0
  }
}

function retryDelay(attempt: number): number {
  return 250 * 2 ** attempt + Math.floor(Math.random() * 150)
}

export async function runClickUpRequest(
  token: string,
  method: string,
  request: () => Promise<Response>
): Promise<Response> {
  const retryable = method.toUpperCase() === 'GET'
  const maxAttempts = retryable ? MAX_GET_ATTEMPTS : 1
  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await reserveRateSlot(token)
    try {
      const response = await request()
      updateBudgetFromResponse(token, response)
      const transient = response.status === 429 || response.status >= 500
      if (!transient || attempt === maxAttempts - 1) {
        return response
      }
      await response.body?.cancel().catch(() => undefined)
      if (response.status === 429) {
        const budget = budgetFor(token)
        await sleep(Math.max(25, budget.resetAt - Date.now()))
      } else {
        await sleep(retryDelay(attempt))
      }
    } catch (error) {
      lastError = error
      if (attempt === maxAttempts - 1) {
        throw error
      }
      await sleep(retryDelay(attempt))
    }
  }

  throw lastError instanceof Error ? lastError : new Error('ClickUp request failed.')
}

export function resetClickUpRequestSchedulerForTests(): void {
  tokenBudgets.clear()
}
