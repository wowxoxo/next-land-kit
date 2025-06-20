/**
 * Validates Russian INN (Taxpayer Identification Number)
 * Supports both 10-digit (legal entity) and 12-digit (individual) INNs.
 */
export function validateINN(inn: string): boolean {
    const checkDigit = (inn: string, coefficients: number[]): number => {
      const sum = coefficients.reduce(
        (acc, coef, i) => acc + coef * parseInt(inn[i], 10),
        0
      )
      return (sum % 11) % 10
    }
  
    const cleaned = inn.replace(/\s+/g, '') // Remove spaces
  
    if (!/^\d{10}$|^\d{12}$/.test(cleaned)) return false
  
    if (cleaned.length === 10) {
      const n10 = checkDigit(cleaned, [2, 4, 10, 3, 5, 9, 4, 6, 8])
      return n10 === parseInt(cleaned[9], 10)
    }
  
    if (cleaned.length === 12) {
      const n11 = checkDigit(cleaned, [7, 2, 4, 10, 3, 5, 9, 4, 6, 8])
      const n12 = checkDigit(cleaned, [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8])
      return (
        n11 === parseInt(cleaned[10], 10) &&
        n12 === parseInt(cleaned[11], 10)
      )
    }
  
    return false
  }
  