import { ErrorType, TelegramAppContext, formatErrorMsg, sendErrorToTG } from '@/telegram/telegram.service'

import type { ILogger } from '@/types/logger'
import nodemailer from 'nodemailer'

interface MailConfig {
  to: string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  message: string
}

interface EmailServiceOptions {
  transport?: ReturnType<typeof nodemailer.createTransport>
  context: TelegramAppContext
  logger?: ILogger
}

/**
 * Initializes and verifies email transport (should be called at startup).
 */
export const checkTransport = async (
  transport: ReturnType<typeof nodemailer.createTransport>,
  context: TelegramAppContext,
  logger: ILogger = console
) => {
  try {
    await transport.verify()
    logger.info?.('Connected to email server')
  } catch (error) {
    logger.warn?.('Unable to connect to email server.')
    const errMsg = formatErrorMsg(
      {
        type: ErrorType.warning,
        title: 'Unable to connect to email server',
        error: error instanceof Error ? error : String(error),
      },
      context
    )
    await sendErrorToTG(errMsg, undefined, undefined, logger)
  }
}

/**
 * Sends an HTML email with fallback logging + Telegram error alert.
 */
export const sendEmail = async (
  config: MailConfig,
  options: EmailServiceOptions
): Promise<void> => {
  const { transport, context, logger = console } = options

  const email = {
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    to: config.to,
    cc: config.cc,
    bcc: config.bcc,
    subject: config.subject,
    html: config.message,
  }

  try {
    if (!transport) {
        logger.warn?.('No transport provided to sendEmail()')
        return
      }
    await transport.sendMail(email)
    logger.info?.(`Email sent to ${config.to.join(', ')}`)
  } catch (error) {
    logger.error?.(`Error sending email: ${(error as Error).message}`)
    logger.error?.(JSON.stringify(email))

    const errMsg = formatErrorMsg(
      {
        type: ErrorType.sending,
        title: 'Error sending email',
        error: error instanceof Error ? error : String(error),
      },
      context
    )
    await sendErrorToTG(errMsg, undefined, undefined, logger)
  }
}
