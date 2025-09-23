import { ErrorType, formatErrorMsg, formatSuccessMsg, sendErrorToTG } from '@/telegram/telegram.service'

import type { ILogger } from '@/types/logger'
import { MailOptions } from 'nodemailer/lib/smtp-transport'
import nodemailer from 'nodemailer'

class SimulatedSmtpSendingError extends Error {
  constructor(address: string) {
    super(`Simulated SMTP sending failure triggered by ${address}`)
    this.name = 'SimulatedSmtpSendingError'
  }
}

class SimulatedFailedEmailPersistenceError extends Error {
  constructor(address: string) {
    super(`Simulated failed email persistence triggered by ${address}`)
    this.name = 'SimulatedFailedEmailPersistenceError'
  }
}

export interface MailConfig {
  from?: MailOptions['from']
  to: string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  message: string
  attachments?: MailOptions['attachments']
}

interface EmailServiceOptions {
  transport?: ReturnType<typeof nodemailer.createTransport>
  logger?: ILogger
  saveOnFail?: boolean
  saveFailedEmail?: (args: {
    from: string
    to: string[]
    cc?: string | string[]
    bcc?: string | string[]
    subject: string
    message: MailOptions['html']
    attachments?: MailOptions['attachments']
    logger?: ILogger
  }) => Promise<string> // Matches the original saveFailedEmail signature
}

/**
 * Initializes and verifies email transport (should be called at startup).
 */
export const checkTransport = async (
  transport: ReturnType<typeof nodemailer.createTransport>,
  logger: ILogger = console
) => {
  try {
    await transport.verify()
    logger.info?.('Connected to email server')
  } catch (error) {
    logger.warn?.('Unable to connect to email server.')
    const errMsg = formatErrorMsg({
      type: ErrorType.warning,
      title: 'Unable to connect to email server',
      error: error instanceof Error ? error : String(error),
    })
    await sendErrorToTG(errMsg)
  }
}

const prepareMessage = (mailConfig: MailConfig): MailOptions => ({
  from: mailConfig.from,
  to: mailConfig.to,
  cc: mailConfig.cc,
  bcc: mailConfig.bcc,
  subject: mailConfig.subject,
  html: mailConfig.message,
  attachments: mailConfig.attachments,
})

/**
 * Sends an HTML email with fallback logging + Telegram error alert.
 */
export const sendEmail = async (
  config: MailConfig,
  options: EmailServiceOptions
): Promise<boolean> => {
  const { transport, logger = console, saveOnFail = false, saveFailedEmail } = options

  const email = {
    from: process.env.EMAIL_FROM || 'no-reply@example.com',
    to: config.to,
    cc: config.cc,
    bcc: config.bcc,
    subject: config.subject,
    html: config.message,
  }

  const msg = prepareMessage(config)
  const mailConfig = config

  try {
    if (!transport) {
      logger.warn?.('No transport provided to sendEmail()')
      throw new Error('No transport provided to sendEmail()')
    }

    if (
      mailConfig.to.length === 1 &&
      (mailConfig.to[0] === 'smtp-sending-error@test.com' ||
        mailConfig.to[0] === 'smtp-save-failed-error@test.com')
    ) {
      throw new SimulatedSmtpSendingError(config.to[0])
    }

    await transport.sendMail(email)
    logger.info?.(`Email sent to ${mailConfig.to.join(', ')}`)
    return true
  } catch (error) {
    logger.error?.(`Error sending email: ${(error as Error).message}`)
    logger.error?.(JSON.stringify(email))

    const errMsg = formatErrorMsg({
      type: ErrorType.sending,
      title: 'Error sending email',
      error: error instanceof Error ? error : String(error),
    })
    await sendErrorToTG(errMsg)

    if (saveOnFail && saveFailedEmail) {
      logger.info?.('Saving failed email for resending')
      try {
        const fromAddress =
          (typeof msg.from === 'string' && msg.from) ||
          (typeof mailConfig.from === 'string' && mailConfig.from) ||
          ''

        if (
          mailConfig.to.length === 1 &&
          mailConfig.to[0] === 'smtp-save-failed-error@test.com'
        ) {
          throw new SimulatedFailedEmailPersistenceError(mailConfig.to[0])
        }

        await saveFailedEmail({
          from: fromAddress,
          to: mailConfig.to,
          cc: mailConfig.cc,
          bcc: mailConfig.bcc,
          subject: mailConfig.subject,
          message: mailConfig.message,
          attachments: mailConfig.attachments,
          logger,
        })
        logger.info?.('Successfully saved failed email for resending')

        const successMsg = formatSuccessMsg(
          'Failed email successfully saved and ready to resend',
          undefined
        )
        await sendErrorToTG(successMsg)
      } catch (savingError) {
        logger.error?.('Error saving failed emails to DB')
        const errMsgSaving = formatErrorMsg({
          type: ErrorType.error,
          title: 'Error occurs through saving failed email',
          error: (savingError as Error).message,
        })
        await sendErrorToTG(errMsgSaving)
      }
    }

    return false
  }
}