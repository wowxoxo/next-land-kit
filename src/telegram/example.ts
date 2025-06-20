import { ErrorType, formatErrorMsg } from "./telegram.service"

const ctx = { appName: 'TrustPlugin Landing', env: 'production' }

const message = formatErrorMsg({
  type: ErrorType.sending,
  title: 'Email delivery failed',
  error: 'SMTP auth failed',
}, ctx)