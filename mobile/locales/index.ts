import type { PurchaseCategory } from '@/types';
import type { TranslationKey } from './en';
import en from './en';
import ar from './ar';
import type { AppLanguage } from '@/types';

export const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en,
  ar,
};

export const CATEGORY_KEYS: Record<PurchaseCategory, TranslationKey> = {
  'Wood': 'categories.wood',
  'Screws & Nails': 'categories.screwsNails',
  'LEDs': 'categories.leds',
  'Paint & Finish': 'categories.paintFinish',
  'Tools': 'categories.tools',
  'Electricity': 'categories.electricity',
  'Shipping': 'categories.shipping',
  'Other': 'categories.other',
};

export type { TranslationKey };
