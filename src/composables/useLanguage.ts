import { useI18n } from 'vue-i18n'

export function useLanguage() {

    const { locale } = useI18n()

    function changeLanguage(newLang: string) {
        // 1. Instantly updates Vue UI bindings
        locale.value = newLang
        // 2. Persists setting so your Axios interceptor sends it in 'Accept-Language'
        localStorage.setItem('user-language', newLang)
    }

    return {
        currentLang: locale,
        changeLanguage
    }
}
