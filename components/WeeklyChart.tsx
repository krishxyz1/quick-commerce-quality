'use client';

import { useLayoutEffect, useRef, useState } from 'react';

interface Line {
  key: string;
  label: string;
  selected: boolean;
  points: { week: string; value: number; reviews: number }[];
}

const fmtWeek = (w: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(w));

// Weekly freshness share. The selected app is the one line in the data hue; the
// others stay grey for context. Straight segments, no markers, a plain tooltip.
export function WeeklyChart({ lines, weeks, max }: { lines: Line[]; weeks: string[]; max: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  const [hover, setHover] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const height = 200;
  const m = { t: 8, r: 96, b: 28, l: 40 };
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const x = (w: string) => m.l + (weeks.indexOf(w) / Math.max(1, weeks.length - 1)) * (width - m.l - m.r);
  const y = (v: number) => height - m.b - (v / max) * (height - m.t - m.b);
  const ordered = [...lines].sort((a, b) => Number(a.selected) - Number(b.selected));

  // End labels, nudged apart so they never overlap.
  const ends = lines
    .filter((l) => l.points.length)
    .map((l) => ({ l, y: y(l.points[l.points.length - 1].value) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left + m.l;
    setHover(weeks.reduce((best, w) => (Math.abs(x(w) - px) < Math.abs(x(best) - px) ? w : best), weeks[0]));
  };

  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label="Share of reviews reporting stale or spoiled food, by week">
        {ticks.map((t, i) => (
          <g key={t}>
            <line x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} className={i === 0 ? 'baseline' : 'gridline'} />
            <text x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tick">
              {`${(t * 100).toFixed(0)}%`}
            </text>
          </g>
        ))}
        {weeks.map((w, i) => (
          <text
            key={w}
            x={x(w)}
            y={height - 8}
            textAnchor={i === 0 ? 'start' : i === weeks.length - 1 ? 'end' : 'middle'}
            className="tick"
          >
            {fmtWeek(w)}
          </text>
        ))}
        {ordered.map((l) => (
          <path
            key={l.key}
            d={l.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.week)},${y(p.value)}`).join('')}
            fill="none"
            stroke={l.selected ? 'var(--chart-1)' : 'var(--chart-grey)'}
            strokeWidth={l.selected ? 2 : 1.5}
            strokeLinejoin="round"
          />
        ))}
        {ends.map(({ l, y: ly }) => (
          <text key={l.key} x={width - m.r + 8} y={ly} dy="0.32em" className={l.selected ? 'end-label is-selected' : 'end-label'}>
            {l.label}
          </text>
        ))}
        {hover && (
          <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={height - m.b} className="hover-line" />
        )}
        <rect
          x={m.l}
          y={m.t}
          width={Math.max(0, width - m.l - m.r)}
          height={height - m.t - m.b}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover && (
        <div className="tip" style={x(hover) > width * 0.55 ? { right: width - x(hover) + 12 } : { left: x(hover) + 12 }}>
          <div className="tip-h">Week of {fmtWeek(hover)}</div>
          {lines.map((l) => {
            const p = l.points.find((q) => q.week === hover);
            return (
              <div key={l.key} className="tip-row">
                <span>{l.label}</span>
                <b>{p ? `${(p.value * 100).toFixed(1)}%` : '–'}</b>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
