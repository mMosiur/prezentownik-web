/**
 * Extracts the first URL from a string, trimming surrounding sentence punctuation
 * while preserving valid URL characters and balanced parentheses/brackets.
 */
export function extractUrl(text: string | null | undefined): string | null {
  if (!text) return null
  const match = text.match(/(https?:\/\/[^\s]+)/i)
  if (!match) return null

  let url = match[0]

  // Trimming trailing sentence punctuation
  // Punctuation characters to remove if at the end: .,;:!?'"”’»›>
  const trailingPunctuationRegex = /[.,;:!?'"”’»›>]+$/

  let changed = true
  while (changed && url.length > 0) {
    changed = false

    const punctMatch = url.match(trailingPunctuationRegex)
    if (punctMatch) {
      url = url.slice(0, -punctMatch[0].length)
      changed = true
    }

    // Check closing parenthesis ')'
    if (url.endsWith(')')) {
      const openCount = (url.match(/\(/g) || []).length
      const closeCount = (url.match(/\)/g) || []).length
      if (closeCount > openCount) {
        url = url.slice(0, -1)
        changed = true
      }
    }

    // Check closing square bracket ']'
    if (url.endsWith(']')) {
      const openCount = (url.match(/\[/g) || []).length
      const closeCount = (url.match(/\]/g) || []).length
      if (closeCount > openCount) {
        url = url.slice(0, -1)
        changed = true
      }
    }

    // Check closing curly bracket '}'
    if (url.endsWith('}')) {
      const openCount = (url.match(/\{/g) || []).length
      const closeCount = (url.match(/\}/g) || []).length
      if (closeCount > openCount) {
        url = url.slice(0, -1)
        changed = true
      }
    }
  }

  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url
    }
    return null
  } catch {
    return null
  }
}

/**
 * Validates and sanitizes a relative redirect destination to prevent open redirects.
 * Allows only same-origin relative URLs within the single-page application.
 */
export function getSafeRedirect(
  redirect: unknown,
  fallback: string | { name: string } = { name: 'dashboard' }
): string | { name: string } {
  if (typeof redirect !== 'string') return fallback
  const trimmed = redirect.trim()
  if (!trimmed) return fallback

  // Reject protocol-relative URLs (//example.com), backslashes (/\\ or \), scheme prefixes, etc.
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.includes('\\')
  ) {
    return fallback
  }

  // Reject control characters
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) {
    return fallback
  }

  return trimmed
}
