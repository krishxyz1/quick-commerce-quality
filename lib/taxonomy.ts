// Issue taxonomy + prompt shared by the offline pipeline (pipeline/classify.mjs)
// and the live triage endpoint (app/api/classify). Kept dependency-free so Node can
// import it directly with type stripping.

export const ISSUES = {
  freshness: 'Stale, rotten, spoiled, mouldy, sour or expired / near-expiry food',
  damaged: 'Crushed, broken, leaking or torn on arrival',
  missing_item: 'Item or quantity paid for but not delivered',
  wrong_item: 'Different product, size, brand or variant than ordered',
  late_delivery: 'Slower than promised, or cancelled after a long wait',
  refund_support: 'Refund refused or delayed, or support was unhelpful',
  pricing_fees: 'High prices, surge / handling / platform fees, price above MRP',
  app_experience: 'Bugs, payment failures, search, coupons, UI problems',
  delivery_partner: 'Rider behaviour: rude, asked for cash, would not come to the door',
  praise: 'Positive review with no complaint',
  other: 'Anything else',
} as const;

export const CATEGORIES = {
  fruits_veg: 'Fruits and vegetables',
  dairy_eggs: 'Milk, curd, paneer, butter, eggs',
  bakery: 'Bread, buns, cakes',
  meat_fish: 'Meat, chicken, fish',
  staples_packaged: 'Atta, rice, dal, oil, packaged food',
  snacks_beverages: 'Snacks, chocolates, drinks, ice cream',
  home_personal: 'Household, personal care, electronics',
  none: 'No product category mentioned',
} as const;

export type IssueKey = keyof typeof ISSUES;
export type CategoryKey = keyof typeof CATEGORIES;

export interface Classification {
  id: string;
  issues: IssueKey[];
  category: CategoryKey;
  severity: 0 | 1 | 2 | 3;
  churn_intent: boolean;
}

const list = (o: Record<string, string>) =>
  Object.entries(o).map(([k, v]) => `- ${k}: ${v}`).join('\n');

export const SYSTEM_PROMPT = `You label Indian quick-commerce grocery app reviews (Blinkit, Zepto, Instamart, BigBasket, Flipkart Minutes and similar). Reviews are often in English, Hinglish or romanised Hindi, short, and may be sarcastic.

For each review return:
- issues: every issue the reviewer actually experienced (multi-label). Use "praise" only when there is no complaint at all. Do not infer issues that are not stated.
${list(ISSUES)}
- category: the product category the complaint is about, or "none".
${list(CATEGORIES)}
- severity: 0 = no problem, 1 = annoyance, 2 = lost money or a ruined order, 3 = health or safety risk (e.g. expired dairy, fungus, insects).
- churn_intent: true only if the reviewer says they stopped, will stop, uninstalled, or switched to another app.

Rules:
- "Fruits were rotten" -> freshness + fruits_veg. "Milk expired / curd sour" -> freshness + dairy_eggs.
- "Delivered someone else's order" -> wrong_item. "Charged but item missing" -> missing_item.
- A cancelled order with no refund -> late_delivery is NOT implied; use refund_support.
- Echo the id exactly.`;

// Gemini structured-output schema (OpenAPI subset) for a batch of reviews.
export const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      id: { type: 'STRING' },
      issues: { type: 'ARRAY', items: { type: 'STRING', enum: Object.keys(ISSUES) } },
      category: { type: 'STRING', enum: Object.keys(CATEGORIES) },
      severity: { type: 'INTEGER' },
      churn_intent: { type: 'BOOLEAN' },
    },
    required: ['id', 'issues', 'category', 'severity', 'churn_intent'],
    propertyOrdering: ['id', 'issues', 'category', 'severity', 'churn_intent'],
  },
} as const;

export const batchPrompt = (reviews: { id: string; text: string; score?: number }[]) =>
  reviews
    .map((r) => `<review id="${r.id}"${r.score ? ` stars="${r.score}"` : ''}>${r.text.replace(/</g, '‹')}</review>`)
    .join('\n');
