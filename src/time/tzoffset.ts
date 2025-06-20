/**
 * Returns the current timezone offset in milliseconds.
 * Useful for aligning server logs or formatting times before sending to APIs.
 */
export const getTZOffsetMs = (): number =>
  new Date().getTimezoneOffset() * 60000
