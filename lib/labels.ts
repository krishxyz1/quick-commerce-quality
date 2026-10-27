import type { CategoryKey, IssueKey } from './taxonomy';

export type ComplaintIssue = Exclude<IssueKey, 'praise' | 'other'>;
export type FoodCategory = Exclude<CategoryKey, 'home_personal' | 'none'>;

/* Words of the trade for every label shown on screen. */

export const ISSUE_LABEL: Record<ComplaintIssue, string> = {
  freshness: 'Stale or spoiled',
  damaged: 'Damaged on arrival',
  missing_item: 'Item missing',
  wrong_item: 'Wrong item',
  late_delivery: 'Late or cancelled',
  refund_support: 'Refund or support',
  pricing_fees: 'Prices and fees',
  app_experience: 'App problems',
  delivery_partner: 'Delivery partner',
};

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  fruits_veg: 'Fruit and veg',
  dairy_eggs: 'Dairy and eggs',
  bakery: 'Bakery',
  meat_fish: 'Meat and fish',
  staples_packaged: 'Staples',
  snacks_beverages: 'Snacks and drinks',
  home_personal: 'Home and personal',
  none: 'Not named',
};

export const FOOD: FoodCategory[] = ['fruits_veg', 'dairy_eggs', 'staples_packaged', 'snacks_beverages', 'bakery', 'meat_fish'];
export const COMPLAINT_ISSUES = Object.keys(ISSUE_LABEL) as ComplaintIssue[];

export const SEVERITY_LABEL = ['No problem', 'Annoyance', 'Lost money', 'Health risk'];

