// Labels every scraped review with the issue taxonomy in lib/taxonomy.ts.
//
//   node pipeline/classify.mjs [--model gemini-3.5-flash-lite] [--batch 40]
//
// Resumable: reviews already in data/reviews.labeled.jsonl are skipped, so a run
// that hits the free-tier daily cap can simply be restarted the next day.
import fs from 'node:fs';
import path from 'node:path';
import { SYSTEM_PROMPT, RESPONSE_SCHEMA, batchPrompt, ISSUES, CATEGORIES } from '../lib/taxonomy.ts';
import { generateJSON } from './gemini.mjs';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : dflt;
};
const MODEL = arg('model', 'gemini-3.5-flash-lite');
const BATCH = Number(arg('batch', 40));
const CONCURRENCY = Number(arg('concurrency', 3));
const IN = path.join('data', 'reviews.raw.jsonl');
const OUT = path.join('data', arg('out', 'reviews.labeled.jsonl'));

const readJsonl = (f) =>
  fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];

const done = new Set(readJsonl(OUT).map((r) => r.id));
let todo = readJsonl(IN).filter((r) => !done.has(r.id));
const limit = Number(arg('limit', 0));
if (limit) todo = todo.slice(0, limit);

// Gemini is asked to echo ids; short aliases keep the prompt small and avoid
// the model mangling 36-char UUIDs.
const batches = [];
for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));
console.log(`${todo.length} reviews to label in ${batches.length} batches with ${MODEL}`);

const out = fs.createWriteStream(OUT, { flags: 'a' });
let tokens = 0;
let labeled = 0;
let next = 0;

async function worker() {
  while (next < batches.length) {
    const b = batches[next++];
    const alias = new Map(b.map((r, i) => [`r${i}`, r]));
    const { data, usage } = await generateJSON({
      model: MODEL,
      system: SYSTEM_PROMPT,
      user: batchPrompt(b.map((r, i) => ({ id: `r${i}`, text: r.text, score: r.score }))),
      schema: RESPONSE_SCHEMA,
    });
    tokens += usage?.totalTokenCount ?? 0;

    for (const c of data) {
      const r = alias.get(c.id);
      if (!r) continue;
      alias.delete(c.id);
      const issues = [...new Set(c.issues.filter((k) => k in ISSUES))];
      out.write(
        JSON.stringify({
          id: r.id,
          issues: issues.length ? issues : ['other'],
          category: c.category in CATEGORIES ? c.category : 'none',
          severity: Math.max(0, Math.min(3, c.severity | 0)),
          churn_intent: !!c.churn_intent,
          model: MODEL,
        }) + '\n',
      );
      labeled++;
    }
    if (alias.size) console.warn(`  ${alias.size} reviews missing from a batch response; they will be retried on the next run`);
    process.stdout.write(`\r  ${labeled}/${todo.length} labeled, ${tokens.toLocaleString()} tokens`);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
out.end();
console.log('\ndone');
