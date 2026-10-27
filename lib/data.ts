import summaryJson from '@/data/summary.json';
import complaintsJson from '@/data/complaints.json';
import type { CategoryKey, IssueKey } from './taxonomy';
import type { ComplaintIssue, FoodCategory } from './labels';

export type { ComplaintIssue, FoodCategory };


export interface AppSummary {
  key: string;
  name: string;
  reviews: number;
  from: string;
  to: string;
  avgStars: number;
  freshness: number;
  freshnessCount: number;
  quality: number;
  churnIntent: number;
  healthRisk: number;
  complaintShare: number;
  issues: Record<ComplaintIssue, number>;
  freshByCategory: Record<FoodCategory, number>;
  weekly: { week: string; reviews: number; freshness: number }[];
  quotes: { id: string; date: string; score: number; text: string; category: CategoryKey; severity: number }[];
}

export interface Validation {
  bulkModel: string;
  checkModel: string;
  n: number;
  exactMatch: number;
  categoryMatch: number;
  perIssue: { issue: IssueKey; prevalence: number; agreement: number; kappa: number }[];
}

export interface Summary {
  generated: string;
  totalReviews: number;
  model: string;
  issuesAvg: Record<ComplaintIssue, number>;
  churnBase: number;
  churnByIssue: { issue: ComplaintIssue; reviews: number; churnIntent: number; avgStars: number }[];
  freshCategories: Record<CategoryKey, number>;
  apps: AppSummary[];
  validation: Validation | null;
}

export interface Complaint {
  id: string;
  app: string;
  date: string;
  score: number;
  text: string;
  issues: ComplaintIssue[];
  category: CategoryKey;
  severity: number;
  churn: boolean;
}

export const summary = summaryJson as unknown as Summary;
export const complaints = complaintsJson as unknown as Complaint[];

export const appByKey = (key: string | undefined) => summary.apps.find((a) => a.key === key);

export { ISSUE_LABEL, CATEGORY_LABEL, FOOD, COMPLAINT_ISSUES, SEVERITY_LABEL } from './labels';

export const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
export const num = (v: number) => v.toLocaleString('en-IN');
export const day = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(iso));
export const daySpan = (a: AppSummary) =>
  Math.round((Date.parse(a.to) - Date.parse(a.from)) / 86_400_000) + 1;
