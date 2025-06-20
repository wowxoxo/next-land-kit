import { getTZOffsetMs } from './tzoffset'

describe('getTZOffsetMs', () => {
  it('returns a number (multiple of 60000)', () => {
    const offset = getTZOffsetMs()
    expect(typeof offset).toBe('number')
    expect(Math.abs(offset % 60000)).toBe(0)
  })
})
