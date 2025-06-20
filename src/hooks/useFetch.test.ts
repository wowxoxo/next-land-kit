import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useFetch } from './useFetch'

describe('useFetch', () => {
  it('handles success', async () => {
    const mockFn = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useFetch(mockFn))

    await act(() => result.current[2]('test'))

    expect(result.current[0]).toBe(false) // isLoading
    expect(result.current[1]).toBe(null) // error
    expect(mockFn).toHaveBeenCalledWith('test')
  })

  it('handles error', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Fail'))
    const { result } = renderHook(() => useFetch(mockFn))

    await act(() => result.current[2]())

    expect(result.current[0]).toBe(false)
    expect(result.current[1]).toBe('Fail')
  })
})
