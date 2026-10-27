import { pct } from '@/lib/data';

/* Server-rendered charts. Hover detail comes from native titles; the numbers are
   always printed as text too, so nothing depends on a pointer. */

// Five teal steps for the matrix, light to dark. Text flips to white from step 3.
const RAMP = ['#eef5f6', '#cfe3e7', '#9cc7d0', '#4f95a5', '#1b6c80'];

export function Matrix({
  rows,
  cols,
  value,
  format,
  highlightRow,
  caption,
}: {
  rows: { key: string; label: string }[];
  cols: { key: string; label: string }[];
  value: (row: string, col: string) => number;
  format: (v: number) => string;
  highlightRow?: string;
  caption: string;
}) {
  const max = Math.max(...rows.flatMap((r) => cols.map((c) => value(r.key, c.key))));
  const step = (v: number) => (v === 0 ? -1 : Math.min(4, Math.floor((v / max) * 4.999)));
  return (
    <div className="matrix-wrap">
      <table className="matrix">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">App</span>
            </th>
            {cols.map((c) => (
              <th key={c.key} scope="col">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={r.key === highlightRow ? 'is-selected' : undefined}>
              <th scope="row">{r.label}</th>
              {cols.map((c) => {
                const v = value(r.key, c.key);
                const s = step(v);
                return (
                  <td
                    key={c.key}
                    title={`${r.label}, ${c.label}: ${format(v)}`}
                    style={{ background: s < 0 ? 'var(--raised)' : RAMP[s], color: s >= 3 ? '#fff' : 'var(--text)' }}
                  >
                    {v === 0 ? '0' : format(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ramp" aria-hidden="true">
        <span>Fewer</span>
        {RAMP.map((c) => (
          <i key={c} style={{ background: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// One row per issue: this app's share as a bar, the all-app average as a 1px tick.
export function BulletList({
  rows,
  max,
}: {
  rows: { key: string; label: string; value: number; target: number }[];
  max: number;
}) {
  return (
    <ul className="bullets">
      {rows.map((r) => {
        const worse = r.value > r.target * 1.25;
        return (
          <li key={r.key} title={`${r.label}: ${pct(r.value)} of reviews, average ${pct(r.target)}`}>
            <span className="bullet-label">{r.label}</span>
            <span className="bullet-track" aria-hidden="true">
              <span className="bullet-bar" style={{ width: `${(r.value / max) * 100}%` }} />
              <span className="bullet-tick" style={{ left: `${(r.target / max) * 100}%` }} />
            </span>
            <span className={`bullet-value${worse ? ' is-worse' : ''}`}>{pct(r.value)}</span>
          </li>
        );
      })}
    </ul>
  );
}

// A sorted list with a thin proportional bar under each label; the top item in ink.
export function BarList({
  rows,
  format,
  reference,
}: {
  rows: { key: string; label: string; value: number; note?: string }[];
  format: (v: number) => string;
  reference?: { value: number; label: string };
}) {
  const max = Math.max(...rows.map((r) => r.value), reference?.value ?? 0);
  return (
    <ul className="barlist">
      {rows.map((r, i) => (
        <li key={r.key} title={r.note}>
          <div className="barlist-row">
            <span>{r.label}</span>
            <b>{format(r.value)}</b>
          </div>
          <span className="barlist-track" aria-hidden="true">
            <span className={i === 0 ? 'is-top' : undefined} style={{ width: `${(r.value / max) * 100}%` }} />
            {reference && <span className="barlist-ref" style={{ left: `${(reference.value / max) * 100}%` }} />}
          </span>
        </li>
      ))}
    </ul>
  );
}
