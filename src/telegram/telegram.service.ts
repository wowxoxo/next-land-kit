import { ILogger } from '@/types/logger'
import axios from 'axios'
import { getConfig } from '@/globalConfig'
import { getTZOffsetMs } from '@/time/tzoffset'

export enum ErrorType {
  warning = 'warning',
  error = 'error',
  sending = 'sending',
  success = 'success',
  question = 'question',
}

interface ErrorObj {
  type: ErrorType
  error?: Error | string
  title?: string
  route?: string
}

const getIcon = (type: ErrorType): string => {
  switch (type) {
    case 'error': return '❌'
    case 'sending': return '🔥'
    case 'success': return '✅'
    case 'question': return '❓'
    case 'warning':
    default: return '⚠'
  }
}
  
  export const formatErrorMsg = (
    err: ErrorObj,
  ): string => {
    const { appName, env} = getConfig();
    const icon = getIcon(err.type)
    const msgApp = `<b>App:</b> ${appName}`
    const msgEnv = `<b>Env:</b> ${env || process.env.NODE_ENV || 'unknown'}`
    const msgType = `<b>Error type:</b> ${icon} ${err.type}`
    const msgTitle = `<b>Error title:</b> ${err.title?.slice(0, 1000) || 'No title'}`
    const msgRoute = `<b>Error route:</b> ${err.route || 'N/A'}`
    const msgTime = `<b>Error time:</b> ${new Date(Date.now() - getTZOffsetMs()).toISOString().slice(0, -1)}`
    const msgMessage = err.error
      ? `<b>Error message:</b> ${typeof err.error === 'string' ? err.error : err.error.message}`
      : ''
    const msgBody = err.error instanceof Error && err.error.stack
      ? `<b>Error stack:</b>\n<code>${JSON.stringify(err.error.stack).slice(0, 350)}</code>`
      : ''
  
    return [msgApp, msgEnv, msgType, msgTitle, msgRoute, msgTime, msgMessage, msgBody]
      .filter(Boolean)
      .join('\n')
  }
  
  export const formatSuccessMsg = (
    title: string,
    ip: string | undefined
  ): string => {
    const { appName, env} = getConfig();
    return [
      `<b>App:</b> ${appName}`,
      `<b>Env:</b> ${env || process.env.NODE_ENV || 'unknown'}`,
      `<b>Msg type:</b> ✅ log`,
      `<b>Msg title:</b> ${title}. User IP: ${ip}`,
      `<b>Msg time:</b> ${new Date(Date.now() - getTZOffsetMs()).toISOString().slice(0, -1)}`
    ].join('\n')
  }

  export const sendErrorToTG = async (
    msg: string,
  ): Promise<void> => {
    const { telegram, logger } = getConfig();
    // const log: ILogger = {
    //   info: logger?.info || console.info,
    //   warn: logger?.warn || console.warn,
    //   error: logger?.error || console.error,
    // }
    const log = logger
  
    if (!telegram.token || !telegram.chatId) {
      log.warn?.('Telegram config missing: no token or chat ID');
      return;
    }
  
    try {
      const url = `https://api.telegram.org/bot${telegram.token}/sendMessage`;
      const res = await axios.post(url, {
        chat_id: telegram.chatId,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        text: msg,
      });
      log.info?.(`Telegram: ${res.statusText}`);
    } catch (err) {
      log.error?.(`Telegram send failed: ${err}`);
    }
  };
  
