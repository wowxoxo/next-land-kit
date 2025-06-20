import { ReactNode, createContext, useContext, useState } from 'react'

const CsrfContext = createContext<string | null>(null)

interface CsrfProviderProps {
  children: ReactNode
  csrfToken: string
}

/**
 * Provides a CSRF token via React Context.
 */
export const CsrfProvider = ({ children, csrfToken }: CsrfProviderProps) => {
  const [token] = useState(csrfToken)
  return <CsrfContext.Provider value={token}>{children}</CsrfContext.Provider>
}

/**
 * Consumes the CSRF token from context.
 */
export const useCsrfToken = (): string | null => {
  return useContext(CsrfContext)
}
