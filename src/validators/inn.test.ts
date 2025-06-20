import { validateINN } from './inn'

describe('validateINN', () => {
  it('validates a correct 10-digit INN', () => {
    expect(validateINN('7707083893')).toBe(true)
  })

  it('validates a correct 12-digit INN', () => {
    expect(validateINN('500100732259')).toBe(true)
  })

  it('returns false for incorrect INNs', () => {
    expect(validateINN('1234567890')).toBe(false)
    expect(validateINN('123456789012')).toBe(false)
    expect(validateINN('')).toBe(false)
  })

  it('ignores spaces in input', () => {
    expect(validateINN(' 7707083893 ')).toBe(true)
  })
})
