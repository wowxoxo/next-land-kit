import { JSONFileSync, LowSync } from 'lowdb'

import { ILogger } from '@/types/logger'
import type { Url as LegacyUrl } from 'url'
import { MailOptions } from 'nodemailer/lib/smtp-transport'
import { URL } from 'url'
import fs from 'fs'
import { mixedUniqId } from '@/utils/mixedUniqId'
import path from 'path'

// Accept a variety of path-ish inputs and return fs.PathLike
const toPathLike = (p: unknown): fs.PathLike | undefined => {
  if (!p) return undefined
  if (typeof p === 'string' || Buffer.isBuffer(p) || p instanceof URL)
    return p as fs.PathLike

  // Legacy Node.js url.Url object support (has .href or .path)
  const maybe = p as Partial<LegacyUrl> & { href?: string; path?: string }
  if (typeof maybe.href === 'string') return maybe.href
  if (typeof maybe.path === 'string') return maybe.path

  return undefined
}

export interface FailedEmailAttachmentRecord {
  filename: string
  path: string
  contentType?: string
  encoding?: string
}

export interface FailedEmailRecord {
  id: string
  from: string
  to: string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  html: string
  attachments: FailedEmailAttachmentRecord[]
  createdAt: string
}

type Schema = { failedEmails: FailedEmailRecord[] }

const dbFilePath = path.resolve(
  process.cwd(),
  'failedEmails.json'
)
const attachmentsDir = path.resolve(
  process.cwd(),
  'failed-email-attachments'
)

const adapter = new JSONFileSync<Schema>(dbFilePath)
const db = new LowSync(adapter)

db.read()
if (!db.data) {
  db.data = { failedEmails: [] }
  db.write()
}

if (!fs.existsSync(attachmentsDir)) {
  fs.mkdirSync(attachmentsDir, { recursive: true })
}

const WINDOWS_RESERVED_BASENAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

const CYR_TO_LAT: Record<string, string> = {
  А: 'A',
  Б: 'B',
  В: 'V',
  Г: 'G',
  Д: 'D',
  Е: 'E',
  Ё: 'Yo',
  Ж: 'Zh',
  З: 'Z',
  И: 'I',
  Й: 'Y',
  К: 'K',
  Л: 'L',
  М: 'M',
  Н: 'N',
  О: 'O',
  П: 'P',
  Р: 'R',
  С: 'S',
  Т: 'T',
  У: 'U',
  Ф: 'F',
  Х: 'Kh',
  Ц: 'Ts',
  Ч: 'Ch',
  Ш: 'Sh',
  Щ: 'Shch',
  Ы: 'Y',
  Э: 'E',
  Ю: 'Yu',
  Я: 'Ya',
  Ъ: '',
  Ь: '',

  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ы: 'y',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  ъ: '',
  ь: '',
}

function translitCyrillicToLatin(s: string): string {
  // char-by-char to avoid /u regex
  var out = ''
  for (var i = 0; i < s.length; i++) {
    var ch = s.charAt(i)
    out += CYR_TO_LAT.hasOwnProperty(ch) ? CYR_TO_LAT[ch] : ch
  }
  return out
}

export function sanitizeFilename(
  filename: string,
  opts?: { asciiOnly?: boolean; max?: number }
): string {
  var MAX = opts && typeof opts.max === 'number' ? opts.max : 180
  var asciiOnly = !!(opts && opts.asciiOnly)

  var normalized = (filename || '').normalize('NFKD')

  // Optionally transliterate *before* removing marks so 'ё' stays meaningful.
  if (asciiOnly) normalized = translitCyrillicToLatin(normalized)

  var sanitized = normalized
    // remove combining marks (no /u flag)
    .replace(
      /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]+/g,
      ''
    )
    // slashes
    .replace(/[\\/]/g, '_')
    // control chars
    .replace(/[\u0000-\u001f\u007f-\u009f]+/g, '_')
    // allow only ASCII if requested, else allow Cyrillic too
    .replace(
      asciiOnly ? /[^0-9A-Za-z._-]+/g : /[^0-9A-Za-z\u0400-\u04FF._-]+/g,
      '_'
    )
    // collapse underscores
    .replace(/_+/g, '_')
    // trim underscores
    .replace(/^_+|_+$/g, '')

  if (!sanitized || sanitized === '.' || sanitized === '..') sanitized = '_'

  // avoid Windows reserved basenames (keep extension)
  var parts = sanitized.split('.')
  var base = parts[0] || ''
  if (WINDOWS_RESERVED_BASENAMES.test(base)) {
    parts[0] = '_' + base
    sanitized = parts.join('.')
  }

  // cap length (preserve extension)
  if (sanitized.length > MAX) {
    var dot = sanitized.lastIndexOf('.')
    if (dot > 0 && dot < sanitized.length - 1) {
      var name = sanitized.slice(0, dot)
      var ext = sanitized.slice(dot)
      var allowed = Math.max(1, MAX - ext.length)
      sanitized = name.slice(0, allowed) + ext
    } else {
      sanitized = sanitized.slice(0, MAX)
    }
  }

  return sanitized || '_'
}

interface SaveFailedEmailArgs {
  from: string
  to: string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  message: MailOptions['html']
  attachments?: MailOptions['attachments']
  logger?: ILogger
}

const ensureStringMessage = (message: MailOptions['html']): string => {
  if (!message) {
    return ''
  }

  if (typeof message === 'string') {
    return message
  }

  if (Buffer.isBuffer(message)) {
    return message.toString('utf8')
  }

  return String(message)
}

const persistAttachments = async (
  emailId: string,
  attachments?: MailOptions['attachments'],
  logger: ILogger = console
): Promise<FailedEmailAttachmentRecord[]> => {
  const storedAttachments: FailedEmailAttachmentRecord[] = []

  if (!attachments || !attachments.length) {
    return storedAttachments
  }

  const emailDir = path.join(attachmentsDir, emailId)
  await fs.promises.mkdir(emailDir, { recursive: true })

  for (let index = 0; index < attachments.length; index += 1) {
    const attachment = attachments[index]
    const filename = sanitizeFilename(
      attachment.filename || `attachment-${index}`,
      { asciiOnly: true }
    )
    const targetPath = path.join(emailDir, filename)

    try {
      if (attachment.path) {
        const src = toPathLike(attachment.path)
        if (!src) {
          logger.warn?.(
            'Attachment path has unsupported type. Skipping attachment save'
          )
          continue
        }
        await fs.promises.copyFile(src, targetPath)
      } else if (attachment.content) {
        let buffer: Buffer

        if (Buffer.isBuffer(attachment.content)) {
          buffer = attachment.content
        } else if (typeof attachment.content === 'string') {
          const encoding =
            (attachment.encoding as BufferEncoding | undefined) || 'utf8'
          buffer = Buffer.from(attachment.content, encoding)
        } else {
          logger.warn?.(
            'Attachment content has unsupported type. Skipping attachment save'
          )
          continue
        }

        // await fs.promises.writeFile(targetPath, buffer as unknown as NodeJS.ArrayBufferView)
        await fs.promises.writeFile(targetPath, new Uint8Array(buffer))
      } else {
        logger.warn?.(
          'Attachment has neither path nor content. Skipping attachment save'
        )
        continue
      }

      storedAttachments.push({
        filename: attachment.filename || filename,
        path: targetPath,
        contentType: attachment.contentType,
        encoding: attachment.encoding,
      })
    } catch (error) {
      logger.error?.(
        `Failed to persist attachment ${filename}: ${(error as Error).message}`
      )
    }
  }

  return storedAttachments
}

export const saveFailedEmail = async ({
  from,
  to,
  cc,
  bcc,
  subject,
  message,
  attachments,
  logger,
}: SaveFailedEmailArgs) => {
  const id = mixedUniqId()
  const storedAttachments = await persistAttachments(id, attachments, logger)

  db.read()
  db.data = db.data || { failedEmails: [] }
  db.data.failedEmails.push({
    id,
    from,
    to,
    cc,
    bcc,
    subject,
    html: ensureStringMessage(message),
    attachments: storedAttachments,
    createdAt: new Date().toISOString(),
  })
  db.write()

  return id
}

export const getFailedEmails = (): FailedEmailRecord[] => {
  db.read()
  return db.data?.failedEmails ? [...db.data.failedEmails] : []
}

export const removeFailedEmail = (id: string) => {
  db.read()
  if (!db.data) {
    db.data = { failedEmails: [] }
  }

  db.data.failedEmails = db.data.failedEmails.filter(
    (failedEmail) => failedEmail.id !== id
  )
  db.write()
}

export const deleteAttachmentFiles = async (
  attachments: FailedEmailAttachmentRecord[],
  logger: ILogger = console
) => {
  const directories = new Set<string>()

  for (const attachment of attachments) {
    try {
      await fs.promises.unlink(attachment.path)
      directories.add(path.dirname(attachment.path))
    } catch (error) {
      logger.warn?.(
        `Failed to remove attachment file ${attachment.path}: ${
          (error as Error).message
        }`
      )
    }
  }

  for (const directory of Array.from(directories)) {
    try {
      await fs.promises.rm(directory, { recursive: true, force: true })
    } catch (error) {
      logger.warn?.(
        `Failed to clean attachment directory ${directory}: ${
          (error as Error).message
        }`
      )
    }
  }
}
