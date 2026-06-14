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

export type AppLanguage = 'en' | 'ar';

export interface WorkspaceSettings {
  incomeGoal?: number;
  lowBalanceThreshold?: number;
  darkMode?: boolean;
  language?: AppLanguage;
}

export interface AppSettings extends WorkspaceSettings {}

export type WorkspaceRole = 'owner' | 'member';

export type TemplateType = 'income' | 'purchase' | 'wage' | 'withdrawal';

export interface TemplatePayload {
  desc?: string;
  name?: string;
  category?: PurchaseCategory;
  supplier?: string;
  worker?: string;
  note?: string;
  recurring?: boolean;
  recurringType?: 'weekly' | 'monthly';
  qty?: number;
  unitPrice?: number;
}

export interface EntryTemplate {
  id: string;
  type: TemplateType;
  label: string;
  payload: TemplatePayload;
  defaultAmount?: number;
}

export interface WorkspaceMember {
  uid: string;
  role: WorkspaceRole;
  joinedAt: string;
  email?: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  settings: WorkspaceSettings;
  inviteCode?: string;
}
