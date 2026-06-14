import { useSettings } from '@/context/SettingsContext';
import { CATEGORY_KEYS, translations, type TranslationKey } from '@/locales';
import type { AppLanguage, PurchaseCategory } from '@/types';

type Params = Record<string, string | number>;

export function useTranslation() {
  const { settings, isRTL } = useSettings();
  const lang: AppLanguage = settings.language ?? 'en';

  function t(key: TranslationKey, params?: Params): string {
    let text = translations[lang][key] ?? translations.en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{{${k}}}`, String(v));
      }
    }
    return text;
  }

  function categoryLabel(category: PurchaseCategory): string {
    return t(CATEGORY_KEYS[category]);
  }

  return { t, lang, isRTL, categoryLabel };
}
