import { NextApiRequest, NextApiResponse } from 'next'

import type { Request } from 'express'
import rateLimit from 'express-rate-limit'
import slowDown from 'express-slow-down'

// export const getIP = (req: NextApiRequest): string => {
//   const forwarded = req.headers['x-forwarded-for']
//   if (typeof forwarded === 'string') {
//     return forwarded.split(',')[0].trim()
//   }
//   return req.socket?.remoteAddress || req.connection?.remoteAddress || ''
// }

export const getIP = (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for']
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim()
    }
    return req.socket?.remoteAddress || req.connection?.remoteAddress || ''
  }

export const applyMiddleware = (middleware: any) =>
  (req: NextApiRequest, res: NextApiResponse) =>
    new Promise((resolve, reject) => {
      middleware(req, res, (result: unknown) =>
        result instanceof Error ? reject(result) : resolve(result)
      )
    })

export const getRateLimitMiddlewares = ({
  limit = 10,
  windowMs = 60 * 1000,
  delayAfter = Math.round(10 / 2),
  delayMs = 1000,
} = {}) => [
  slowDown({ keyGenerator: getIP, windowMs, delayAfter, delayMs }),
  rateLimit({ keyGenerator: getIP, windowMs, max: limit }),
]

/**
 * Applies rate limiting middleware to Next.js API routes.
 */
export const applyRateLimit = async (
  req: NextApiRequest,
  res: NextApiResponse,
  middlewares = getRateLimitMiddlewares()
) => {
  await Promise.all(
    middlewares.map(applyMiddleware).map((mw) => mw(req, res))
  )
}
