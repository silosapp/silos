// To add a new language later:
//   1. Add `src/locales/<code>.json` with the same keys as `it.json`.
//   2. Import it below and add it to `resources`.
//   3. Add one <option value="<code>"> to the language <select> in GlobalSettingsView.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { emit, listen } from "@tauri-apps/api/event";
import it from "./locales/it.json";
import en from "./locales/en.json";

const LANGUAGE_CHANGED_EVENT = "language-changed";

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

// Every window (dashboard, per-app settings, global settings) boots its own
// React/i18next instance — changing the language in one doesn't touch the
// others on its own, so a switch is broadcast to every window via a Tauri
// event instead of relying on the shared localStorage cache (which only
// takes effect on that window's next reload).
listen<string>(LANGUAGE_CHANGED_EVENT, (event) => {
  if (event.payload !== i18n.language.split("-")[0]) {
    i18n.changeLanguage(event.payload);
  }
});

export function changeLanguageEverywhere(lang: string) {
  i18n.changeLanguage(lang);
  emit(LANGUAGE_CHANGED_EVENT, lang);
}

export default i18n;
