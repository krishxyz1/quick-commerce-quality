// Minimal Gemini REST client with free-tier friendly retries.
// Reads GEMINI_API_KEY from the environment (see .env.example).
import fs from 'node:fs';

if (!process.env.GEMINI_API_KEY && fs.existsSync('.env.local')) {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) throw new Error('GEMINI_API_KEY is not set');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function generateJSON({ model, system, user, schema, temperature = 0 }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: { temperature, responseMimeType: 'application/json', responseSchema: schema },
  };

  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    }).catch((e) => ({ ok: false, status: 504, json: async () => ({}), text: async () => String(e) }));

    if (res.ok) {
      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
      return { data: JSON.parse(text), usage: json.usageMetadata };
    }

    // 429 = rate limited, 5xx = overloaded. The API sends a RetryInfo hint on 429.
    if (res.status === 429 || res.status >= 500) {
      // 504 here also covers a request that timed out on our side.
      const err = await res.json().catch(() => ({}));
      const hint = err.error?.details?.find((d) => d.retryDelay)?.retryDelay;
      const wait = hint ? parseFloat(hint) * 1000 : 2 ** attempt * 4000;
      // A wait of many minutes means the daily quota is gone; stop instead of hanging.
      if (wait > 10 * 60_000) throw new Error(`Quota exhausted for ${model}; retry after ${Math.round(wait / 3_600_000)} h`);
      console.warn(`  ${res.status} from ${model}, retrying in ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      continue;
    }
    throw new Error(`${res.status} ${await res.text()}`);
  }
  throw new Error('Gave up after repeated rate limits');
}
