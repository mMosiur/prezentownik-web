/**
 * Returns the plural category ('one' | 'few' | 'many') for a count based on the locale.
 * Supports Polish plural rules (1 = one; 2-4 except 12-14 = few; 0, 5-21, etc. = many)
 * and English plural rules (1 = one; other = many).
 */
export function getPluralForm(count: number, locale: string): 'one' | 'few' | 'many' {
  if (locale === 'pl') {
    const absCount = Math.abs(count)
    const mod10 = absCount % 10
    const mod100 = absCount % 100
    if (absCount === 1) return 'one'
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
      return 'few'
    }
    return 'many'
  }
  return Math.abs(count) === 1 ? 'one' : 'many'
}
