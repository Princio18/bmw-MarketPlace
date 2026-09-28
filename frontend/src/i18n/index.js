import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import fr from './locales/fr.json'
import adminEn from './locales/admin.en.json'
import adminFr from './locales/admin.fr.json'

const savedLanguage = localStorage.getItem('bmw-lang')
const initialLanguage = savedLanguage === 'fr' ? 'fr' : 'en'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en, admin: adminEn },
    fr: { translation: fr, admin: adminFr },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
})

function applyLanguage(lng) {
  localStorage.setItem('bmw-lang', lng)
  document.documentElement.lang = lng
}

i18n.on('languageChanged', applyLanguage)
applyLanguage(i18n.resolvedLanguage || i18n.language)

export default i18n