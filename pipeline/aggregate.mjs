// Joins raw reviews with their labels and writes the two files the dashboard reads:
//   data/summary.json     per-app rates, issue mix, category matrix, weekly trend, quotes
//   data/complaints.json  every review with at least one complaint, for the review log
//
//   node pipeline/aggregate.mjs
import fs from 'node:fs';
import path from 'node:path';
import { APPS } from './apps.mjs';

const readJsonl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const raw = readJsonl(path.join('data', 'reviews.raw.jsonl'));
const labels = new Map(readJsonl(path.join('data', 'reviews.labeled.jsonl')).map((l) => [l.id, l]));
const reviews = raw.filter((r) => labels.has(r.id)).map((r) => ({ ...r, ...labels.get(r.id) }));

const COMPLAINTS = ['freshness', 'damaged', 'missing_item', 'wrong_item', 'late_delivery', 'refund_support', 'pricing_fees', 'app_experience', 'delivery_partner'];
const QUALITY = ['freshness', 'damaged', 'missing_item', 'wrong_item'];
const FOOD = ['fruits_veg', 'dairy_eggs', 'bakery', 'meat_fish', 'staples_packaged', 'snacks_beverages'];

const has = (r, i) => r.issues.includes(i);
const share = (rows, pred) => (rows.length ? rows.filter(pred).length / rows.length : 0);
const round = (v, d = 4) => Math.round(v * 10 ** d) / 10 ** d;

// ISO week key (Monday start), e.g. "2026-10-19".
const weekOf = (iso) => {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
};

const apps = APPS.map((app) => {
  const rows = reviews.filter((r) => r.app === app.key);
  const dates = rows.map((r) => r.date).sort();
  const complaints = rows.filter((r) => COMPLAINTS.some((i) => has(r, i)));
  const fresh = rows.filter((r) => has(r, 'freshness'));

  const weeks = {};
  for (const r of rows) (weeks[weekOf(r.date)] ??= []).push(r);
  const weekly = Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    // A week needs enough reviews for its rate to mean anything.
    .filter(([, w]) => w.length >= 60)
    .map(([week, w]) => ({ week, reviews: w.length, freshness: round(share(w, (r) => has(r, 'freshness'))) }));

  const quotes = fresh
    .filter((r) => r.text.length >= 60 && r.text.length <= 260 && r.category !== 'none')
    .sort((a, b) => b.severity - a.severity || b.thumbsUp - a.thumbsUp || b.date.localeCompare(a.date))
    .slice(0, 6)
    .map((r) => ({ id: r.id, date: r.date.slice(0, 10), score: r.score, text: r.text, category: r.category, severity: r.severity }));

  return {
    key: app.key,
    name: app.name,
    reviews: rows.length,
    from: dates[0].slice(0, 10),
    to: dates[dates.length - 1].slice(0, 10),
    avgStars: round(rows.reduce((s, r) => s + r.score, 0) / rows.length, 2),
    freshness: round(share(rows, (r) => has(r, 'freshness'))),
    freshnessCount: fresh.length,
    quality: round(share(rows, (r) => QUALITY.some((i) => has(r, i)))),
    churnIntent: round(share(rows, (r) => r.churn_intent)),
    healthRisk: rows.filter((r) => r.severity === 3).length,
    complaintShare: round(complaints.length / rows.length),
    issues: Object.fromEntries(COMPLAINTS.map((i) => [i, round(share(rows, (r) => has(r, i)))])),
    // Freshness complaints per 1,000 reviews, by food category.
    freshByCategory: Object.fromEntries(
      FOOD.map((c) => [c, round((fresh.filter((r) => r.category === c).length / rows.length) * 1000, 1)]),
    ),
    weekly,
    quotes,
  };
});

const all = reviews;
const churnBase = share(all, (r) => r.churn_intent);
const churnByIssue = COMPLAINTS.map((i) => {
  const rows = all.filter((r) => has(r, i));
  return { issue: i, reviews: rows.length, churnIntent: round(share(rows, (r) => r.churn_intent)), avgStars: round(rows.reduce((s, r) => s + r.score, 0) / rows.length, 2) };
}).sort((a, b) => b.churnIntent - a.churnIntent);

const freshAll = all.filter((r) => has(r, 'freshness'));
const freshCategories = Object.fromEntries(
  [...FOOD, 'home_personal', 'none'].map((c) => [c, freshAll.filter((r) => r.category === c).length]),
);

const validation = fs.existsSync(path.join('data', 'validation.json'))
  ? JSON.parse(fs.readFileSync(path.join('data', 'validation.json'), 'utf8'))
  : null;

const summary = {
  generated: new Date().toISOString().slice(0, 10),
  totalReviews: all.length,
  model: labels.values().next().value.model,
  issuesAvg: Object.fromEntries(COMPLAINTS.map((i) => [i, round(share(all, (r) => has(r, i)))])),
  churnBase: round(churnBase),
  churnByIssue,
  freshCategories,
  apps,
  validation,
};

fs.writeFileSync(path.join('data', 'summary.json'), JSON.stringify(summary, null, 1));

const complaints = all
  .filter((r) => COMPLAINTS.some((i) => has(r, i)))
  .sort((a, b) => b.date.localeCompare(a.date))
  .map((r) => ({
    id: r.id,
    app: r.app,
    date: r.date.slice(0, 10),
    score: r.score,
    text: r.text,
    issues: r.issues.filter((i) => i !== 'praise' && i !== 'other'),
    category: r.category,
    severity: r.severity,
    churn: r.churn_intent,
  }));
fs.writeFileSync(path.join('data', 'complaints.json'), JSON.stringify(complaints));

console.log(`summary: ${apps.length} apps, ${all.length} reviews · complaints: ${complaints.length}`);
for (const a of apps) console.log(`  ${a.name.padEnd(20)} fresh ${(a.freshness * 100).toFixed(1)}%  quality ${(a.quality * 100).toFixed(1)}%  weeks ${a.weekly.length}  quotes ${a.quotes.length}`);
console.log('churn by issue', churnByIssue.map((c) => `${c.issue} ${(c.churnIntent * 100).toFixed(0)}%`).join(', '));
