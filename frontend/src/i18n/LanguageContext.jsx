import { createContext, useContext, useState, useCallback } from 'react'
import { translations } from './translations'

const LANG_KEY = 'vps-language'

export const LANGUAGES = [
  { code: 'en', label: 'English',  native: 'English' },
  { code: 'hi', label: 'Hindi',    native: 'हिन्दी' },
  { code: 'mr', label: 'Marathi',  native: 'मराठी' },
  { code: 'bn', label: 'Bangla',   native: 'বাংলা' },
  { code: 'sa', label: 'Sanskrit', native: 'संस्कृतम्' },
  { code: 'bho', label: 'Bhojpuri', native: 'भोजपुरी' },
  { code: 'hne', label: 'Haryanvi', native: 'हरियाणवी' },
  { code: 'mwr', label: 'Malvi',    native: 'माळवी' },
]

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(LANG_KEY) || 'en')

  const setLang = useCallback((code) => {
    setLangState(code)
    localStorage.setItem(LANG_KEY, code)
  }, [])

  const t = useCallback((key) => {
    return translations[lang]?.[key] || translations['en']?.[key] || key
  }, [lang])

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider')
  return ctx
}
