// Spot-checks the bulk labels with a second, different model on a fixed random sample
// and reports per-issue agreement (Cohen's kappa). Low-kappa issues get flagged on
// the dashboard instead of being presented as precise.
//
//   node pipeline/validate.mjs [--n 200] [--model gemini-3.1-flash-lite]
import fs from 'node:fs';
import path from 'node:path';
import { SYSTEM_PROMPT, RESPONSE_SCHEMA, batchPrompt, ISSUES } from '../lib/taxonomy.ts';
import { generateJSON } from './gemini.mjs';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
};
const N = Number(arg('n', 200));
const MODEL = arg('model', 'gemini-3.1-flash-lite');

const readJsonl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const raw = new Map(readJsonl(path.join('data', 'reviews.raw.jsonl')).map((r) => [r.id, r]));
const labels = readJsonl(path.join('data', 'reviews.labeled.jsonl'));

// Deterministic shuffle (mulberry32) so the sample is reproducible.
let seed = 42;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const sample = [...labels].sort(() => rand() - 0.5).slice(0, N);

const second = new Map();
for (let i = 0; i < sample.length; i += 25) {
  const chunk = sample.slice(i, i + 25).map((l, j) => ({ alias: `r${j}`, l, r: raw.get(l.id) }));
  const { data } = await generateJSON({
    model: MODEL,
    system: SYSTEM_PROMPT,
    user: batchPrompt(chunk.map((c) => ({ id: c.alias, text: c.r.text, score: c.r.score }))),
    schema: RESPONSE_SCHEMA,
  });
  for (const d of data) {
    const c = chunk.find((x) => x.alias === d.id);
    if (c) second.set(c.l.id, d);
  }
  process.stdout.write(`\r  ${second.size}/${sample.length}`);
}

const pairs = sample.filter((l) => second.has(l.id)).map((l) => [l, second.get(l.id)]);
const kappa = (a, b) => {
  const n = a.length;
  const po = a.filter((x, i) => x === b[i]).length / n;
  const pa = a.filter(Boolean).length / n;
  const pb = b.filter(Boolean).length / n;
  const pe = pa * pb + (1 - pa) * (1 - pb);
  return pe === 1 ? 1 : (po - pe) / (1 - pe);
};

const perIssue = Object.keys(ISSUES).map((k) => {
  const a = pairs.map(([x]) => x.issues.includes(k));
  const b = pairs.map(([, y]) => y.issues.includes(k));
  return {
    issue: k,
    prevalence: a.filter(Boolean).length / pairs.length,
    agreement: a.filter((x, i) => x === b[i]).length / pairs.length,
    kappa: kappa(a, b),
  };
});

const result = {
  bulkModel: labels[0].model,
  checkModel: MODEL,
  n: pairs.length,
  exactMatch: pairs.filter(([x, y]) => [...x.issues].sort().join() === [...y.issues].sort().join()).length / pairs.length,
  categoryMatch: pairs.filter(([x, y]) => x.category === y.category).length / pairs.length,
  perIssue,
};
fs.writeFileSync(path.join('data', 'validation.json'), JSON.stringify(result, null, 2));
console.log('\n', result);
