import axios from 'axios'

export interface ParsedApiError {
  message: string
  fieldErrors: Record<string, string>
}

/**
 * Translates common ASP.NET Core Identity & data annotation error messages to Polish.
 */
export function translateErrorMessage(message: string): string {
  if (!message) return ''

  const lower = message.toLowerCase().trim()

  // Invalid login credentials / Identity error codes
  if (lower === 'failed' || lower.includes('invalid email or password') || lower.includes('invalid credentials')) {
    return 'Nieprawidłowy adres e-mail lub hasło. Sprawdź wprowadzone dane.'
  }
  if (lower === 'islockedout' || lower.includes('locked out') || lower.includes('account is locked')) {
    return 'Twoje konto zostało tymczasowo zablokowane z powodu zbyt wielu nieudanych prób logowania. Spróbuj ponownie za kilka minut.'
  }
  if (lower === 'isnotallowed' || lower.includes('not allowed')) {
    return 'Logowanie nie jest dozwolone. Twoje konto może być nieaktywne lub zablokowane.'
  }
  if (lower === 'requirestwofactor' || lower.includes('two factor') || lower.includes('2fa')) {
    return 'Wymagana jest weryfikacja dwuetapowa.'
  }

  // Common ASP.NET Identity registration & password error messages
  if (lower.includes('already taken') || lower.includes('duplicateusername') || lower.includes('duplicateemail') || lower.includes('is already associated with another account')) {
    return 'Konto o podanym adresie e-mail już istnieje. Zaloguj się lub użyj innego adresu.'
  }
  if (lower.includes('passwords must be at least') || lower.includes('passwordtooshort')) {
    return 'Hasło musi mieć co najmniej 6 znaków.'
  }
  if (lower.includes('passwords must have at least one non alphanumeric') || lower.includes('passwordrequiresnonalphanumeric')) {
    return 'Hasło musi zawierać co najmniej jeden znak specjalny.'
  }
  if (lower.includes('passwords must have at least one digit') || lower.includes('passwordrequiresdigit')) {
    return 'Hasło musi zawierać co najmniej jedną cyfrę.'
  }
  if (lower.includes('passwords must have at least one uppercase') || lower.includes('passwordrequiresupper')) {
    return 'Hasło musi zawierać co najmniej jedną wielką literę.'
  }
  if (lower.includes('passwords must have at least one lowercase') || lower.includes('passwordrequireslower')) {
    return 'Hasło musi zawierać co najmniej jedną małą literę.'
  }

  // Email format validation
  if (lower.includes('not a valid e-mail address') || lower.includes('invalid email') || lower.includes('nieprawidłowy adres email')) {
    return 'Podaj poprawny adres e-mail.'
  }

  // Required field validation
  if (lower.includes('field is required') || lower.includes('is required')) {
    if (lower.includes('email')) return 'Adres e-mail jest wymagany.'
    if (lower.includes('password') || lower.includes('hasło')) return 'Hasło jest wymagane.'
    return 'To pole jest wymagane.'
  }

  // If already in Polish or unrecognized, return as-is
  return message
}

/**
 * Parses any API/Axios error into a user-friendly message and dictionary of field errors.
 */
export function parseApiError(err: unknown, defaultMessage = 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.'): ParsedApiError {
  if (!axios.isAxiosError(err)) {
    if (err instanceof Error && err.message) {
      return { message: err.message, fieldErrors: {} }
    }
    return { message: defaultMessage, fieldErrors: {} }
  }

  // Network offline / connection refused / timeout
  if (!err.response) {
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return {
        message: 'Przekroczono limit czasu połączenia z serwerem. Sprawdź swoje połączenie internetowe i spróbuj ponownie.',
        fieldErrors: {},
      }
    }
    return {
      message: 'Nie można nawiązać połączenia z serwerem. Upewnij się, że masz połączenie z Internetem.',
      fieldErrors: {},
    }
  }

  const { status, data } = err.response
  const fieldErrors: Record<string, string> = {}

  // Parse validation error dictionary (e.g. from HttpValidationProblemDetails)
  if (data && typeof data === 'object') {
    const errorsObj = (data as any).errors
    if (errorsObj && typeof errorsObj === 'object') {
      for (const [key, val] of Object.entries(errorsObj)) {
        if (Array.isArray(val) && val.length > 0) {
          const translated = val.map((msg: string) => translateErrorMessage(msg)).join(' ')
          fieldErrors[key] = translated
          // Normalize key casing (e.g. "email" or "Email")
          fieldErrors[key.toLowerCase()] = translated
        } else if (typeof val === 'string') {
          const translated = translateErrorMessage(val)
          fieldErrors[key] = translated
          fieldErrors[key.toLowerCase()] = translated
        }
      }
    }
  }

  // Status code specific handling
  if (status === 401) {
    const detail = data?.detail || data?.title
    if (detail && typeof detail === 'string') {
      return {
        message: translateErrorMessage(detail),
        fieldErrors,
      }
    }
    return {
      message: 'Nieprawidłowy adres e-mail lub hasło. Sprawdź wprowadzone dane.',
      fieldErrors,
    }
  }

  if (status === 400) {
    // If we extracted field errors, provide a helpful summary
    if (Object.keys(fieldErrors).length > 0) {
      return {
        message: 'Wprowadzone dane formularza zawierają błędy. Popraw je i spróbuj ponownie.',
        fieldErrors,
      }
    }

    const detail = data?.detail || data?.message || data?.title
    if (detail && typeof detail === 'string' && detail !== 'One or more validation errors occurred.' && detail !== 'Bad Request') {
      return {
        message: translateErrorMessage(detail),
        fieldErrors,
      }
    }

    return {
      message: 'Wprowadzone dane są nieprawidłowe. Upewnij się, że wszystkie pola są wypełnione poprawnie.',
      fieldErrors,
    }
  }

  if (status === 403) {
    return {
      message: 'Brak uprawnień do wykonania tej operacji.',
      fieldErrors,
    }
  }

  if (status === 404) {
    return {
      message: 'Żądany zasób nie został odnaleziony.',
      fieldErrors,
    }
  }

  if (status === 423) {
    return {
      message: 'Twoje konto zostało zablokowane. Spróbuj ponownie później.',
      fieldErrors,
    }
  }

  if (status === 429) {
    return {
      message: 'Zbyt wiele prób w krótkim czasie. Odczekaj chwilę przed kolejną próbą.',
      fieldErrors,
    }
  }

  if (status >= 500) {
    return {
      message: 'Wystąpił problem po stronie serwera. Pracujemy nad jego rozwiązaniem, spróbuj ponownie za chwilę.',
      fieldErrors,
    }
  }

  return {
    message: defaultMessage,
    fieldErrors,
  }
}
