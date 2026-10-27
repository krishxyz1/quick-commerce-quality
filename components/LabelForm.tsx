'use client';

import { useState } from 'react';
import { CATEGORY_LABEL, ISSUE_LABEL, SEVERITY_LABEL } from '@/lib/labels';
import type { CategoryKey, IssueKey } from '@/lib/taxonomy';

interface Result {
  issues: IssueKey[];
  category: CategoryKey;
  severity: number;
  churn_intent: boolean;
}

const issueName = (i: IssueKey) =>
  i === 'praise' ? 'Praise, no complaint' : i === 'other' ? 'Something else' : ISSUE_LABEL[i];

export function LabelForm({ examples }: { examples: { app: string; text: string }[] }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError('');
    if (text.trim().length < 10) {
      setError('Paste a review of at least a few words.');
      document.getElementById('review')?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Try again.');
        setResult(null);
      } else {
        setResult(json);
      }
    } catch {
      setError('Could not reach the labeller. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="label-layout">
      <form className="card label-form" onSubmit={submit}>
        <label htmlFor="review" className="field-label">
          Review text
        </label>
        <textarea
          id="review"
          name="review"
          rows={7}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder="e.g. Ordered curd and paneer, both were sour and past the date…"
          aria-describedby={error ? 'review-error' : 'review-hint'}
          aria-invalid={Boolean(error) || undefined}
        />
        {error ? (
          <p id="review-error" className="field-error" role="alert">
            {error}
          </p>
        ) : (
          <p id="review-hint" className="field-hint">
            English, Hinglish or romanised Hindi. Up to 1,500 characters. Ctrl + Enter to send.
          </p>
        )}
        <div className="form-actions">
          <button className="button primary" type="submit" disabled={busy}>
            {busy && <span className="spinner" aria-hidden="true" />}
            Label review
          </button>
          {text && (
            <button
              className="text-link"
              type="button"
              onClick={() => {
                setText('');
                setResult(null);
                setError('');
              }}
            >
              Clear
            </button>
          )}
        </div>
        <div className="examples">
          <p className="field-label">Or try a real review from the dataset</p>
          <ul>
            {examples.map((ex) => (
              <li key={ex.text}>
                <button type="button" onClick={() => setText(ex.text)}>
                  <span>{ex.text}</span>
                  <small>{ex.app}</small>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </form>

      <section className="card label-result" aria-live="polite" aria-labelledby="result-h">
        <h2 id="result-h">Label</h2>
        {result ? (
          <dl className="result">
            <div>
              <dt>Issues</dt>
              <dd className="tags">
                {result.issues.map((i) => (
                  <span key={i} className="pill">
                    {issueName(i)}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt>Food</dt>
              <dd>{CATEGORY_LABEL[result.category]}</dd>
            </div>
            <div>
              <dt>Severity</dt>
              <dd>
                {result.severity === 3 ? <span className="pill negative">{SEVERITY_LABEL[3]}</span> : SEVERITY_LABEL[result.severity]}
              </dd>
            </div>
            <div>
              <dt>Says they are leaving</dt>
              <dd>{result.churn_intent ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
        ) : (
          <p className="empty">
            {busy ? 'Labelling…' : 'The label appears here: the issues, the food it is about, how serious it is, and whether the customer says they are leaving.'}
          </p>
        )}
      </section>
    </div>
  );
}
