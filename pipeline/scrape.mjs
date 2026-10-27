// Pulls the newest Play Store reviews (India, English) for each app in apps.mjs.
//
//   node pipeline/scrape.mjs [perApp=2000]
//
// Writes data/reviews.raw.jsonl. Reviewer names and avatars are dropped on purpose:
// the analysis only needs the text, star rating, date and app version.
import fs from 'node:fs';
import path from 'node:path';
import gplay from 'google-play-scraper';
import { APPS } from './apps.mjs';

const PER_APP = Number(process.argv[2] ?? 2000);
const OUT = path.join('data', 'reviews.raw.jsonl');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

fs.mkdirSync('data', { recursive: true });
const out = fs.createWriteStream(OUT);

for (const app of APPS) {
  let token;
  let kept = 0;
  const seen = new Set();

  while (kept < PER_APP) {
    const page = await gplay.reviews({
      appId: app.appId,
      sort: gplay.sort.NEWEST,
      lang: 'en',
      country: 'in',
      num: 200,
      paginate: true,
      nextPaginationToken: token,
    });

    for (const r of page.data) {
      const text = (r.text ?? '').trim();
      // One-word reviews ("good", "nice app") carry no issue signal; skip them so the
      // per-app sample is made of reviews that can actually be classified.
      if (seen.has(r.id) || text.split(/\s+/).length < 4) continue;
      seen.add(r.id);
      out.write(
        JSON.stringify({
          id: r.id,
          app: app.key,
          score: r.score,
          text,
          date: r.date,
          thumbsUp: r.thumbsUp,
          version: r.version ?? null,
        }) + '\n',
      );
      if (++kept >= PER_APP) break;
    }

    token = page.nextPaginationToken;
    if (!token) break;
    await sleep(400);
  }
  console.log(`${app.name.padEnd(20)} ${kept} reviews`);
}

out.end();
