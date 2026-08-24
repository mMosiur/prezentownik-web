import axios from 'axios'

export interface ParsedApiError {
  message: string
  fieldErrors: Record<string, string>
}

/**
 * Maps well-known ASP.NET Core Identity error codes (as used in the `errors`
 * dictionary of a ProblemDetails/HttpValidationProblemDetails response) to the
 * actual form field they relate to, so inline validation messages appear
 * under the correct input instead of only in the general error banner.
 */
export const identityErrorCodeToField: Record<string, string> = {
  duplicateusername: 'email',
  duplicateemail: 'email',
  invalidusername: 'email',
  invalidemail: 'email',
  passwordtooshort: 'password',
  passwordrequiresnonalphanumeric: 'password',
  passwordrequiresdigit: 'password',
  passwordrequiresupper: 'password',
  passwordrequireslower: 'password',
  passwordrequiresuniquechars: 'password',
  passwordmismatch: 'password',
  useralreadyhaspassword: 'password',
}

/**
 * Standard Identity error codes that represent general/account-level errors
 * rather than specific input field validation errors.
 */
export const generalIdentityErrorCodes = new Set([
  'concurrencyfailure',
  'defaulterror',
  'invalidtoken',
  'loginalreadyassociated',
  'userlockoutnotenabled',
  'useralreadyinrole',
  'usernotinrole',
  'invalidrolename',
  'duplicaterolename',
  'recoverycoderedemptionfailed',
  'islockedout',
  'isnotallowed',
  'requirestwofactor',
])

/**
 * Returns the error message. The backend sends localized Polish error messages
 * when the Accept-Language: pl header is sent.
 */
export function translateErrorMessage(message: string): string {
  return message || ''
}

/**
 * Parses any API/Axios error into a user-friendly message and dictionary of field errors.
 * Uses localized error messages sent by the backend and places errors based on Identity error codes.
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
  const generalMessages: string[] = []
  const fieldMessages: string[] = []

  // Parse validation error dictionary (e.g. from HttpValidationProblemDetails,
  // or the Identity error dictionary returned by MapIdentityApi's
  // /register endpoint, whose keys are Identity error codes like
  // "DuplicateUserName" or "PasswordTooShort" rather than form field names)
  if (data && typeof data === 'object') {
    const errorsObj = (data as any).errors
    if (errorsObj && typeof errorsObj === 'object') {
      for (const [key, val] of Object.entries(errorsObj)) {
        const messages = Array.isArray(val) ? val : (typeof val === 'string' ? [val] : [])
        if (messages.length === 0) continue

        const formatted = messages.filter(Boolean).join(' ')
        if (!formatted) continue

        const lowerKey = key.toLowerCase()

        const mappedField = identityErrorCodeToField[lowerKey]
        if (mappedField) {
          fieldErrors[mappedField] = fieldErrors[mappedField]
            ? `${fieldErrors[mappedField]} ${formatted}`
            : formatted
          fieldErrors[lowerKey] = formatted
          fieldErrors[key] = formatted
          fieldMessages.push(formatted)
        } else if (generalIdentityErrorCodes.has(lowerKey)) {
          generalMessages.push(formatted)
        } else {
          // Standard form field validation error (e.g. from data annotations / model validation)
          fieldErrors[key] = fieldErrors[key]
            ? `${fieldErrors[key]} ${formatted}`
            : formatted
          fieldErrors[lowerKey] = fieldErrors[lowerKey]
            ? `${fieldErrors[lowerKey]} ${formatted}`
            : formatted
          fieldMessages.push(formatted)
        }
      }
    }
  }

  // Status code specific handling
  if (status === 401) {
    const detail = data?.detail || data?.message || data?.title
    if (detail && typeof detail === 'string' && detail !== 'Unauthorized') {
      return {
        message: detail,
        fieldErrors,
      }
    }
    return {
      message: 'Nieprawidłowy adres e-mail lub hasło. Sprawdź wprowadzone dane.',
      fieldErrors,
    }
  }

  if (status === 400) {
    if (generalMessages.length > 0) {
      const uniqueGeneral = Array.from(new Set(generalMessages))
      return {
        message: uniqueGeneral.join(' '),
        fieldErrors,
      }
    }

    // If we extracted field errors and have no general error messages,
    // do not set a general message so the error is not duplicated both
    // above the form in the alert banner and under the input field.
    if (Object.keys(fieldErrors).length > 0) {
      return {
        message: '',
        fieldErrors,
      }
    }

    const detail = data?.detail || data?.message || data?.title
    if (detail && typeof detail === 'string' && detail !== 'One or more validation errors occurred.' && detail !== 'Bad Request') {
      return {
        message: detail,
        fieldErrors,
      }
    }

    return {
      message: 'Wprowadzone dane są nieprawidłowe. Upewnij się, że wszystkie pola są wypełnione poprawnie.',
      fieldErrors,
    }
  }

  if (status === 403) {
    const detail = data?.detail || data?.message
    if (detail && typeof detail === 'string') {
      return {
        message: detail,
        fieldErrors,
      }
    }
    return {
      message: 'Brak uprawnień do wykonania tej operacji.',
      fieldErrors,
    }
  }

  if (status === 404) {
    const detail = data?.detail || data?.message
    if (detail && typeof detail === 'string') {
      return {
        message: detail,
        fieldErrors,
      }
    }
    return {
      message: 'Żądany zasób nie został odnaleziony.',
      fieldErrors,
    }
  }

  if (status === 423) {
    const detail = data?.detail || data?.message
    if (detail && typeof detail === 'string') {
      return {
        message: detail,
        fieldErrors,
      }
    }
    return {
      message: 'Twoje konto zostało zablokowane. Spróbuj ponownie później.',
      fieldErrors,
    }
  }

  if (status === 429) {
    const detail = data?.detail || data?.message
    if (detail && typeof detail === 'string') {
      return {
        message: detail,
        fieldErrors,
      }
    }
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
