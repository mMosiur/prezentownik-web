import { createI18n } from 'vue-i18n'
import pl from './locales/pl.json'
import en from './locales/en.json'

function resolveInitialLocale(): string {
  // 1. Check saved user preference
  let savedLocale: string | null = null
  try {
    savedLocale = localStorage.getItem('user-language') || localStorage.getItem('user_locale')
  } catch {
    // Continue with the browser language when storage is unavailable.
  }
  if (savedLocale) return savedLocale

  // 2. Check browser settings
  const browserLang = typeof navigator !== 'undefined' && navigator.language ? navigator.language.split('-')[0] : 'pl'
  const supported = ['pl', 'en']

  if (browserLang && supported.includes(browserLang)) {
    return browserLang
  }

  // 3. Hard fallback
  return 'pl'
}

export const i18n = createI18n({
  legacy: false, // Mandatory for Vue 3 Composition API
  locale: resolveInitialLocale(),
  fallbackLocale: 'pl',
  messages: {
    pl,
    en
  }
})
