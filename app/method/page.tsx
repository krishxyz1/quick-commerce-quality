import type { Metadata } from 'next';
import { ISSUES } from '@/lib/taxonomy';
import { ISSUE_LABEL, day, daySpan, num, pct, summary } from '@/lib/data';

export const metadata: Metadata = { title: 'Method' };

export default function Method() {
  const v = summary.validation;
  return (
    <>
      <div className="title-row">
        <div>
          <h1>Method</h1>
          <p className="subtitle">Where the numbers come from, what each label means, and where they fall short.</p>
        </div>
      </div>

      <div className="grid">
        <section className="card span-7" aria-labelledby="tax-h">
          <header className="card-head">
            <h2 id="tax-h">What each label means</h2>
          </header>
          <table className="plain">
            <thead>
              <tr>
                <th>Issue</th>
                <th>Means</th>
                <th className="num">All reviews</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(ISSUE_LABEL) as (keyof typeof ISSUE_LABEL)[]).map((k) => (
                <tr key={k}>
                  <td>{ISSUE_LABEL[k]}</td>
                  <td className="wrap muted">{ISSUES[k]}</td>
                  <td className="num">{pct(summary.issuesAvg[k])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card span-5" aria-labelledby="window-h">
          <header className="card-head">
            <h2 id="window-h">What each app’s sample covers</h2>
          </header>
          <table className="plain">
            <thead>
              <tr>
                <th>App</th>
                <th className="num">Reviews</th>
                <th className="num">From</th>
                <th className="num">To</th>
                <th className="num">Days</th>
              </tr>
            </thead>
            <tbody>
              {summary.apps.map((a) => (
                <tr key={a.key}>
                  <td>{a.name}</td>
                  <td className="num">{num(a.reviews)}</td>
                  <td className="num">{day(a.from)}</td>
                  <td className="num">{day(a.to)}</td>
                  <td className="num">{daySpan(a)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="card-note">
            The newest English Play Store reviews from India for each app. Busy apps fill their quota in days, quieter ones
            over weeks, so rates are compared as shares of each app’s own reviews, never as counts.
          </p>
        </section>

        <section className="card span-7" aria-labelledby="limits-h">
          <header className="card-head">
            <h2 id="limits-h">Limits</h2>
          </header>
          <ul className="limits">
            <li>Play Store reviewers are not all customers. People write when something goes wrong, so every rate here is higher than the true rate of bad orders.</li>
            <li>Rates compare apps fairly only if their unhappy customers are equally likely to write. An app that prompts for reviews after good orders will look better.</li>
            <li>The labels come from a language model. The quality issues agree well between two models; vaguer issues agree less.</li>
            <li>Weeks are short and samples small, so a weekly move of a point or two is noise.</li>
          </ul>
        </section>

        <section className="card span-5" aria-labelledby="agree-h">
          <header className="card-head">
            <h2 id="agree-h">Agreement with a second model</h2>
          </header>
          {v ? (
            <>
              <p className="card-lead">
                {num(v.n)} random reviews labelled again by a larger model. The full set of issues matches on{' '}
                {pct(v.exactMatch, 0)} of reviews, and the food on {pct(v.categoryMatch, 0)}.
              </p>
              <table className="plain">
                <thead>
                  <tr>
                    <th>Issue</th>
                    <th className="num">Agree</th>
                    <th className="num">Kappa</th>
                  </tr>
                </thead>
                <tbody>
                  {v.perIssue
                    .filter((p) => p.issue in ISSUE_LABEL)
                    .map((p) => (
                      <tr key={p.issue}>
                        <td>{ISSUE_LABEL[p.issue as keyof typeof ISSUE_LABEL]}</td>
                        <td className="num">{pct(p.agreement)}</td>
                        <td className="num">{p.kappa.toFixed(2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="empty">The second labelling pass is still running.</p>
          )}
        </section>
      </div>
    </>
  );
}
