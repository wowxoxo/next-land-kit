import { ErrorType, formatErrorMsg, sendErrorToTG } from '@/telegram/telegram.service'
import type { NextApiRequest, NextApiResponse } from 'next'

import type { ILogger } from '@/types/logger'

let globalRequestCounter = 0
let globalWindowStart = Date.now()

export interface GlobalLimiterOptions {
  limit: number
  windowMs: number
  logger?: ILogger
}

/**
 * Simple global in-memory rate limiter across all IPs.
 */
export const globalRateLimiter = async (
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void,
  options: GlobalLimiterOptions
): Promise<void> => {
  const { limit, windowMs, logger = console } = options
  const now = Date.now()

  if (now - globalWindowStart > windowMs) {
    globalRequestCounter = 0
    globalWindowStart = now
  }

  globalRequestCounter++

  if (globalRequestCounter > limit) {
    const errMsg = formatErrorMsg(
      {
        type: ErrorType.error,
        title: `Global limit exceeded: ${limit} requests per ${windowMs / 60000} min`,
      },
    )
    await sendErrorToTG(errMsg)

    res.status(429).json({
      message: 'Too many requests globally. Please try again later.',
    })
    return
  }

  res.status(200) // ✅ explicitly mark success, not sure if this is needed
  next()
}

export const __resetRateMapForTests = () => {
    globalRequestCounter = 0
    globalWindowStart = Date.now()
  }