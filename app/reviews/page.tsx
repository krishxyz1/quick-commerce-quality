import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CATEGORY_LABEL,
  COMPLAINT_ISSUES,
  ISSUE_LABEL,
  SEVERITY_LABEL,
  complaints,
  day,
  num,
  summary,
  type ComplaintIssue,
} from '@/lib/data';
import type { CategoryKey } from '@/lib/taxonomy';

export const metadata: Metadata = { title: 'Review log' };

const PAGE = 50;
const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

export default async function Reviews({ searchParams }: PageProps<'/reviews'>) {
  const sp = await searchParams;
  const app = one(sp.app);
  const issue = one(sp.issue) as ComplaintIssue | '';
  const category = one(sp.category) as CategoryKey | '';
  const q = one(sp.q).trim().toLowerCase();
  const risk = one(sp.risk) === '1';
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const rows = complaints.filter(
    (c) =>
      (!app || c.app === app) &&
      (!issue || c.issues.includes(issue)) &&
      (!category || c.category === category) &&
      (!risk || c.severity === 3) &&
      (!q || c.text.toLowerCase().includes(q)),
  );
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice((page - 1) * PAGE, page * PAGE);
  const appName = Object.fromEntries(summary.apps.map((a) => [a.key, a.name.replace(' (BB Now)', '')]));

  const href = (toPage: number) => {
    const params = new URLSearchParams();
    if (app) params.set('app', app);
    if (issue) params.set('issue', issue);
    if (category) params.set('category', category);
    if (one(sp.q)) params.set('q', one(sp.q));
    if (risk) params.set('risk', '1');
    if (toPage > 1) params.set('page', String(toPage));
    return `/reviews?${params}`;
  };
  const filtered = Boolean(app || issue || category || q || risk);

  return (
    <>
      <div className="title-row">
        <div>
          <h1>Review log</h1>
          <p className="subtitle">
            Every review with at least one complaint, newest first. {num(complaints.length)} of{' '}
            {num(summary.totalReviews)} reviews.
          </p>
        </div>
      </div>

      <form className="filters" action="/reviews" role="search">
        <label>
          <span className="sr-only">App</span>
          <select name="app" defaultValue={app}>
            <option value="">All apps</option>
            {summary.apps.map((a) => (
              <option key={a.key} value={a.key}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Issue</span>
          <select name="issue" defaultValue={issue}>
            <option value="">All issues</option>
            {COMPLAINT_ISSUES.map((i) => (
              <option key={i} value={i}>
                {ISSUE_LABEL[i]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Food</span>
          <select name="category" defaultValue={category}>
            <option value="">Any food</option>
            {(Object.keys(CATEGORY_LABEL) as CategoryKey[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="search">
          <span className="sr-only">Search review text</span>
          <input type="search" name="q" defaultValue={one(sp.q)} placeholder="Search reviews, e.g. curd…" autoComplete="off" spellCheck={false} />
        </label>
        <label className="check">
          <input type="checkbox" name="risk" value="1" defaultChecked={risk} />
          Health risk only
        </label>
        <button className="button" type="submit">
          Apply
        </button>
        {filtered && (
          <Link className="text-link" href="/reviews">
            Clear
          </Link>
        )}
      </form>

      <p className="count" aria-live="polite">
        {rows.length === 0
          ? 'No reviews match these filters.'
          : `${num((page - 1) * PAGE + 1)}–${num(Math.min(page * PAGE, rows.length))} of ${num(rows.length)}`}
      </p>

      {rows.length > 0 && (
        <div className="table-card">
          <table className="log">
            <thead>
              <tr>
                <th className="col-date">Date</th>
                <th className="col-app">App</th>
                <th className="col-stars num">Stars</th>
                <th>Review</th>
                <th className="col-issues">Labelled as</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id}>
                  <td className="col-date">{day(c.date)}</td>
                  <td className="col-app">{appName[c.app]}</td>
                  <td className="col-stars num">{c.score} of 5</td>
                  <td className="col-text">
                    <p>{c.text}</p>
                    <p className="row-meta">
                      {c.category !== 'none' && CATEGORY_LABEL[c.category]}
                      {c.churn && <span>{c.category !== 'none' && ' · '}Says they are leaving</span>}
                    </p>
                  </td>
                  <td className="col-issues">
                    <span className="tags">
                      {c.severity === 3 && <span className="pill negative">{SEVERITY_LABEL[3]}</span>}
                      {c.issues.map((i) => (
                        <span key={i} className="pill">
                          {ISSUE_LABEL[i]}
                        </span>
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav className="pager" aria-label="Pages">
          {page > 1 ? (
            <Link className="button" href={href(page - 1)}>
              Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="count">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link className="button" href={href(page + 1)}>
              Older
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
