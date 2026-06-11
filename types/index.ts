export type Period = 'week' | 'month' | 'year' | 'all';

export type PurchaseCategory =
  | 'Wood'
  | 'Screws & Nails'
  | 'LEDs'
  | 'Paint & Finish'
  | 'Tools'
  | 'Electricity'
  | 'Shipping'
  | 'Other';

export const PURCHASE_CATEGORIES: PurchaseCategory[] = [
  'Wood', 'Screws & Nails', 'LEDs', 'Paint & Finish',
  'Tools', 'Electricity', 'Shipping', 'Other',
];

export interface Income {
  id: string;
  desc: string;
  amount: number;
  date: string;
  photo?: string;
  note?: string;
}

export interface Purchase {
  id: string;
  name: string;
  qty?: number;
  unitPrice?: number;
  amount: number;
  category: PurchaseCategory;
  supplier?: string;
  date: string;
  photo?: string;
  note?: string;
}

export interface Wage {
  id: string;
  worker: string;
  amount: number;
  date: string;
  note?: string;
  recurring?: boolean;
  recurringType?: 'weekly' | 'monthly';
}

export interface Withdrawal {
  id: string;
  desc: string;
  amount: number;
  date: string;
  note?: string;
}

export interface AppSettings {
  pin?: string;
  incomeGoal?: number;
  lowBalanceThreshold?: number;
  darkMode?: boolean;
}
