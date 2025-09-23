import { useCallback, useState } from 'react'

interface UseFetchOptions {
  loadingByDefault?: boolean
}

export const useFetch = <Args extends any[]>(
  applyFn: (...args: Args) => Promise<void>,
  options: UseFetchOptions = {}
) => {
  const [isLoading, setIsLoading] = useState(!!options.loadingByDefault)
  const [error, setError] = useState<string | null>(null)

  const sendRequest = useCallback(
    async (...args: Args) => {
      setIsLoading(true)
      setError(null)
      try {
        await applyFn(...args)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Произошла непредвиденная ошибка при выполнении запроса'
        )
      } finally {
        setIsLoading(false)
      }
    },
    [applyFn]
  )

  return [isLoading, error, sendRequest] as const
}
