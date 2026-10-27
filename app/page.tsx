import Link from 'next/link';
import { BarList, BulletList, Matrix } from '@/components/charts';
import { WeeklyChart } from '@/components/WeeklyChart';
import {
  CATEGORY_LABEL,
  COMPLAINT_ISSUES,
  FOOD,
  ISSUE_LABEL,
  appByKey,
  day,
  daySpan,
  num,
  pct,
  summary,
} from '@/lib/data';

const byFreshness = [...summary.apps].sort((a, b) => b.freshness - a.freshness);
const worst = byFreshness[0];
const best = byFreshness.filter((a) => a.reviews >= 1000).at(-1)!;

export default async function Overview({ searchParams }: PageProps<'/'>) {
  const { app: appParam } = await searchParams;
  const app = appByKey(typeof appParam === 'string' ? appParam : undefined) ?? worst;

  const foodNamed = FOOD.reduce((s, c) => s + summary.freshCategories[c], 0);
  const freshTop2 = (summary.freshCategories.fruits_veg + summary.freshCategories.dairy_eggs) / foodNamed;
  const issueRows = COMPLAINT_ISSUES.map((i) => ({
    key: i,
    label: ISSUE_LABEL[i],
    value: app.issues[i],
    target: summary.issuesAvg[i],
  })).sort((a, b) => b.value - a.value);
  const issueMax = Math.max(...summary.apps.flatMap((a) => Object.values(a.issues)));

  const weeks = [...new Set(summary.apps.flatMap((a) => a.weekly.map((w) => w.week)))].sort();
  const weeklyMax = Math.ceil(Math.max(...summary.apps.flatMap((a) => a.weekly.map((w) => w.freshness))) * 20) / 20;
  const v = summary.validation;
  const freshKappa = v?.perIssue.find((p) => p.issue === 'freshness')?.kappa;

  return (
    <>
      <div className="title-row">
        <div>
          <h1>Freshness complaints by app</h1>
          <p className="subtitle">
            {worst.name} reviews report stale or spoiled food {pct(worst.freshness)} of the time, {(worst.freshness / best.freshness).toFixed(1)}×{' '}
            {best.name}’s rate. Fruit, vegetables and dairy make up {pct(freshTop2, 0)} of the freshness complaints that
            name a food.
          </p>
        </div>
        <div className="title-actions">
          <span className="stamp">Reviews to {day(summary.apps[0].to)}</span>
          <Link className="button primary" href="/label">
            Label a review
          </Link>
        </div>
      </div>

      <nav className="kpi-tabs" aria-label="Choose an app">
        {summary.apps.map((a) => (
          <Link
            key={a.key}
            href={`/?app=${a.key}`}
            scroll={false}
            aria-current={a.key === app.key ? 'true' : undefined}
            className="kpi"
          >
            <span className="kpi-label">{a.name}</span>
            <span className="kpi-value">{pct(a.freshness)}</span>
            <span className="kpi-sub">
              of {num(a.reviews)} reviews · {daySpan(a)} days
            </span>
          </Link>
        ))}
      </nav>

      {/* 12 columns, 24px gap: 7 + 5 spans. 7 × 74.3 + 6 × 24 = 664; 5 × 74.3 + 4 × 24 = 468; 664 + 24 + 468 = 1156 */}
      <div className="grid">
        <section className="card span-7" aria-labelledby="matrix-h">
          <header className="card-head">
            <h2 id="matrix-h">Where freshness breaks, by food</h2>
            <span className="card-meta">Complaints per 1,000 reviews</span>
          </header>
          <Matrix
            caption="Stale or spoiled complaints per 1,000 reviews, by app and food category"
            rows={summary.apps.map((a) => ({ key: a.key, label: a.name }))}
            cols={FOOD.map((c) => ({ key: c, label: CATEGORY_LABEL[c] }))}
            value={(r, c) => appByKey(r)!.freshByCategory[c as (typeof FOOD)[number]]}
            format={(x) => x.toFixed(1)}
            highlightRow={app.key}
          />
          <p className="card-note">
            {num(summary.freshCategories.none)} freshness complaints name no food and are left out. Flipkart Minutes has{' '}
            {num(appByKey('minutes')!.reviews)} reviews in this window, so its row is thin.
          </p>
        </section>

        <section className="card span-5" aria-labelledby="quotes-h">
          <header className="card-head">
            <h2 id="quotes-h">What {app.name} customers wrote</h2>
            <Link className="card-action" href={`/reviews?app=${app.key}&issue=freshness`}>
              All {num(app.freshnessCount)}
            </Link>
          </header>
          <ul className="quotes">
            {app.quotes.slice(0, 3).map((q) => (
              <li key={q.id}>
                <blockquote>“{q.text}”</blockquote>
                <p className="quote-meta">
                  {q.score} of 5 · {CATEGORY_LABEL[q.category]} · {day(q.date)}
                  {q.severity === 3 && <span className="pill negative">Health risk</span>}
                </p>
              </li>
            ))}
            {app.quotes.length === 0 && <li className="empty">No freshness complaint names a food for this app yet.</li>}
          </ul>
        </section>

        <section className="card span-7" aria-labelledby="mix-h">
          <header className="card-head">
            <h2 id="mix-h">What {app.name} reviews complain about</h2>
            <span className="legend">
              <span>
                <i className="swatch-bar" aria-hidden="true" />
                {app.name}
              </span>
              <span>
                <i className="swatch-tick" aria-hidden="true" />
                All five apps
              </span>
            </span>
          </header>
          <BulletList rows={issueRows} max={issueMax} />
        </section>

        <section className="card span-5" aria-labelledby="churn-h">
          <header className="card-head">
            <h2 id="churn-h">Which complaints come with “I’m leaving”</h2>
          </header>
          <p className="card-lead">
            Share of reviews with each issue that say the customer stopped, uninstalled or switched. Across all reviews it
            is {pct(summary.churnBase)}.
          </p>
          <BarList
            rows={summary.churnByIssue.map((c) => ({
              key: c.issue,
              label: ISSUE_LABEL[c.issue],
              value: c.churnIntent,
              note: `${num(c.reviews)} reviews, ${c.avgStars.toFixed(1)} of 5 on average`,
            }))}
            format={(x) => pct(x, 0)}
          />
        </section>

        <section className="card span-7" aria-labelledby="week-h">
          <header className="card-head">
            <h2 id="week-h">Week by week</h2>
            <span className="card-meta">Share of reviews reporting stale or spoiled food</span>
          </header>
          <WeeklyChart
            weeks={weeks}
            max={weeklyMax}
            lines={summary.apps
              .filter((a) => a.weekly.length >= 3)
              .map((a) => ({
                key: a.key,
                label: a.name.replace(' (BB Now)', ''),
                selected: a.key === app.key,
                points: a.weekly.map((w) => ({ week: w.week, value: w.freshness, reviews: w.reviews })),
              }))}
          />
          <p className="card-note">
            Weeks with at least 60 reviews. Blinkit’s newest {num(2500)} reviews cover only {daySpan(appByKey('blinkit')!)}{' '}
            days, and Flipkart Minutes has too few reviews a week, so neither has a line.
          </p>
        </section>

        <section className="card span-5" aria-labelledby="trust-h">
          <header className="card-head">
            <h2 id="trust-h">How far to trust the labels</h2>
            <Link className="card-action" href="/method">
              Method
            </Link>
          </header>
          {v ? (
            <>
              <p className="card-lead">
                {num(v.n)} reviews were labelled a second time by a larger model. Agreement per issue as Cohen’s kappa;
                above 0.6 is strong.
              </p>
              <BarList
                rows={v.perIssue
                  .filter((p) => p.issue !== 'other' && p.issue !== 'praise' && p.prevalence > 0.01)
                  .map((p) => ({ key: p.issue, label: ISSUE_LABEL[p.issue as keyof typeof ISSUE_LABEL], value: Math.max(0, p.kappa) }))
                  .sort((a, b) => b.value - a.value)}
                format={(x) => x.toFixed(2)}
              />
              {freshKappa !== undefined && (
                <p className="card-note">Freshness, the issue this screen leads with, scores {freshKappa.toFixed(2)}.</p>
              )}
            </>
          ) : (
            <p className="empty">The second labelling pass is still running.</p>
          )}
        </section>
      </div>
    </>
  );
}
