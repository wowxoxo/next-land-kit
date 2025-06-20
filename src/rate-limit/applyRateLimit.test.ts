import type { NextApiRequest, NextApiResponse } from 'next'
import { applyRateLimit, getRateLimitMiddlewares } from './applyRateLimit'

import { createMocks } from 'node-mocks-http'

describe('applyRateLimit', () => {
  it('does not throw with default config', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        'x-forwarded-for': '127.0.0.1',
      },
    })

    await applyRateLimit(
      req as unknown as NextApiRequest,
      res as unknown as NextApiResponse
    )
  })

  it('respects custom limits', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        'x-forwarded-for': '127.0.0.2',
      },
    })

    const middlewares = getRateLimitMiddlewares({
      limit: 2,
      windowMs: 60 * 1000,
    })

    await applyRateLimit(
      req as unknown as NextApiRequest,
      res as unknown as NextApiResponse,
      middlewares
    )
  })
})
