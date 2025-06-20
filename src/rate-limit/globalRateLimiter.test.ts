import type { NextApiRequest, NextApiResponse } from 'next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TelegramAppContext } from '../telegram/telegram.service'
import { createMocks } from 'node-mocks-http'
import { globalRateLimiter } from './globalRateLimiter'

const context: TelegramAppContext = {
  appName: 'TestApp',
  env: 'test',
}

describe('globalRateLimiter', () => {
  let nextFn: ReturnType<typeof vi.fn>
  let logger: any

  beforeEach(() => {
    vi.useFakeTimers()
    nextFn = vi.fn()
    logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  const createReqRes = () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: { 'x-forwarded-for': '127.0.0.1' },
    })
    return {
      req: req as unknown as NextApiRequest,
      res: res as any,
    }
  }

  it('allows requests under the limit', async () => {
    const { req, res } = createReqRes()

    await globalRateLimiter(req, res, nextFn, {
      limit: 2,
      windowMs: 10000,
      context,
      logger,
    })

    expect(nextFn).toHaveBeenCalledOnce()
    expect(res._getStatusCode()).toBe(200)
  })

  it('blocks requests over the limit', async () => {
    const { req, res } = createReqRes()

    const opts = {
      limit: 1,
      windowMs: 10000,
      context,
      logger,
    }

    await globalRateLimiter(req, res, nextFn, opts) // 1st request
    expect(nextFn).toHaveBeenCalledOnce()

    const { req: req2, res: res2 } = createReqRes()
    await globalRateLimiter(req2, res2, nextFn, opts) // 2nd request (should be blocked)

    expect(res2._getStatusCode()).toBe(429)
    expect(res2._getData()).toContain('Too many requests')
    expect(nextFn).toHaveBeenCalledOnce() // still only 1 call
  })

  it('resets counter after window', async () => {
    const { req, res } = createReqRes()

    const opts = {
      limit: 1,
      windowMs: 10000,
      context,
      logger,
    }

    await globalRateLimiter(req, res, nextFn, opts)
    expect(nextFn).toHaveBeenCalledOnce()

    vi.advanceTimersByTime(11000)
    await vi.runOnlyPendingTimersAsync()

    const { req: req2, res: res2 } = createReqRes()
    await globalRateLimiter(req2, res2, nextFn, opts)

    expect(res2._getStatusCode()).toBe(200)
    expect(nextFn).toHaveBeenCalledTimes(2)
  })
})
