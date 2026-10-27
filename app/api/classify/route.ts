import { CATEGORIES, ISSUES, RESPONSE_SCHEMA, SYSTEM_PROMPT, batchPrompt, type Classification } from '@/lib/taxonomy';

// Same prompt and schema as the offline pipeline, on one review at a time.
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// Best-effort per-instance limit so one visitor can't drain the free-tier quota.
const WINDOW_MS = 60_000;
const PER_WINDOW = 8;
const hits = new Map<string, number[]>();

function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > PER_WINDOW;
}

export async function POST(request: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json({ error: 'The labeller is not configured on this deployment (GEMINI_API_KEY is missing).' }, { status: 503 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (limited(ip)) {
    return Response.json({ error: 'That is a lot of reviews in a minute. Wait a moment and try again.' }, { status: 429 });
  }

  let text = '';
  try {
    text = String((await request.json()).text ?? '').trim();
  } catch {
    return Response.json({ error: 'Send JSON with a "text" field.' }, { status: 400 });
  }
  if (text.length < 10) return Response.json({ error: 'Paste a review of at least a few words.' }, { status: 400 });
  if (text.length > 1500) return Response.json({ error: 'Keep it under 1,500 characters, about the length of a long review.' }, { status: 400 });

  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: batchPrompt([{ id: 'r0', text }]) }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
    }),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);

  if (!res) return Response.json({ error: 'The model took too long to answer. Try again.' }, { status: 504 });
  if (res.status === 429) {
    return Response.json({ error: 'The free model quota is used up for the moment. Try again in a minute.' }, { status: 503 });
  }
  if (!res.ok) return Response.json({ error: `The model returned an error (${res.status}). Try again.` }, { status: 502 });

  const json = await res.json();
  const raw = json.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '[]';
  let label: Classification | undefined;
  try {
    label = (JSON.parse(raw) as Classification[])[0];
  } catch {
    label = undefined;
  }
  if (!label) return Response.json({ error: 'The model answered in an unexpected shape. Try again.' }, { status: 502 });

  const issues = label.issues.filter((i) => i in ISSUES);
  return Response.json({
    issues: issues.length ? issues : ['other'],
    category: label.category in CATEGORIES ? label.category : 'none',
    severity: Math.max(0, Math.min(3, Number(label.severity) | 0)),
    churn_intent: Boolean(label.churn_intent),
    model: MODEL,
  });
}
