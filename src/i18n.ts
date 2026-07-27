// To add a new language later:
//   1. Add `src/locales/<code>.json` with the same keys as `it.json`.
//   2. Import it below and add it to `resources`.
//   3. Add one <option value="<code>"> to the language <select> in GlobalSettingsView.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import it from "./locales/it.json";
import en from "./locales/en.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      it: { translation: it },
      en: { translation: en },
    },
    // Falls back to English (not Italian) when the system language isn't one
    // we ship a translation for — Italian only wins when the OS itself
    // reports it (see `navigator` detection below).
    fallbackLng: "en",
    supportedLngs: ["it", "en"],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "silos_language",
      caches: ["localStorage"],
    },
  });

export default i18n;
