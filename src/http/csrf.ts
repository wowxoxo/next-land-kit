import csurf from 'csurf'

/**
 * Promisified CSRF middleware for use in API routes
 */
export function csrf(req: any, res: any): Promise<void> {
  return new Promise((resolve, reject) => {
    csurf({ cookie: true })(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result)
      }
      return resolve()
    })
  })
}
