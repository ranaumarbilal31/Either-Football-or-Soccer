import React, { useId, useMemo, useState } from 'react';
import { ArrowUpRight, Crosshair } from 'lucide-react';
import type { Player, PositionType } from '../types';

const COLORS: Record<PositionType, string> = { GK: '#e8bf72', DEF: '#82aaff', MID: '#b9a0ec', FWD: '#f48b56' };
export function chartSummary(players: Player[]) {
  const data = players.filter(p => Number.isFinite(p.rating) && Number.isFinite(p.price));
  const n = data.length;
  const rating = n ? data.reduce((a, p) => a + p.rating, 0) / n : 0;
  const cost = n ? data.reduce((a, p) => a + p.price, 0) / n : 0;
  const xx = data.reduce((a, p) => a + (p.rating - rating) ** 2, 0);
  const yy = data.reduce((a, p) => a + (p.price - cost) ** 2, 0);
  const xy = data.reduce((a, p) => a + (p.rating - rating) * (p.price - cost), 0);
  return { data, rating, cost, slope: xx > 0 && n > 1 ? xy / xx : null,
    correlation: xx > 0 && yy > 0 ? xy / Math.sqrt(xx * yy) : null,
    minRating: Math.min(70, ...data.map(p => Math.floor(p.rating / 5) * 5)),
    maxRating: Math.max(95, ...data.map(p => Math.ceil(p.rating / 5) * 5)),
    maxCost: Math.max(200, ...data.map(p => Math.ceil(p.price / 50) * 50)) };
}

export default function ValueChart({ players }: { players: Player[] }) {
  const [filter, setFilter] = useState<PositionType | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const summary = useMemo(() => chartSummary(players.filter(p => filter === 'ALL' || p.position === filter)), [players, filter]);
  const selected = summary.data.find(p => p.id === selectedId);
  const clipId = useId();
  const W = 600, H = 370, left = 58, right = 24, top = 28, bottom = 54;
  const plotW = W - left - right, plotH = H - top - bottom;
  const x = (v: number) => left + (v - summary.minRating) / (summary.maxRating - summary.minRating) * plotW;
  const y = (v: number) => H - bottom - v / summary.maxCost * plotH;
  const ticksX = Array.from({ length: 6 }, (_, i) => summary.minRating + i * (summary.maxRating - summary.minRating) / 5);
  const ticksY = Array.from({ length: 5 }, (_, i) => i * summary.maxCost / 4);
  const inspect = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width * W;
    const py = (event.clientY - rect.top) / rect.height * H;
    let closest: Player | undefined;
    let distance = 22 ** 2;
    for (const p of summary.data) {
      const d = (x(p.rating) - px) ** 2 + (y(p.price) - py) ** 2;
      if (d < distance) { distance = d; closest = p; }
    }
    if (closest) setSelectedId(closest.id);
  };
  return <section className="value-chart" aria-labelledby="value-chart-heading">
    <div className="section-kicker"><span>THE TRANSFER MARKET</span><ArrowUpRight size={18} /></div>
    <h2 id="value-chart-heading">OVR vs Cost</h2>
    <p className="section-description">Find the quality. Know the price. Build smarter.</p>
    <div className="chart-filters" aria-label="Chart position filters">
      {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map(role => <button key={role} aria-pressed={filter === role} onClick={() => { setFilter(role); setSelectedId(null); }}>
        {role !== 'ALL' && <span style={{ background: COLORS[role] }} />}{role === 'ALL' ? 'All positions' : role}
      </button>)}
    </div>
    <div className="chart-canvas">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Overall rating versus cost scatter plot, ${summary.data.length} players. Use the player selector below for exact values.`} onPointerMove={inspect} onPointerDown={inspect}>
        <defs><clipPath id={clipId}><rect x={left - 5} y={top - 5} width={plotW + 10} height={plotH + 10} /></clipPath></defs>
        {ticksY.map(tick => <g key={tick}><line x1={left} x2={W - right} y1={y(tick)} y2={y(tick)} stroke="#33415a" strokeDasharray="3 6" /><text x={left - 12} y={y(tick) + 4} textAnchor="end">{Math.round(tick)}</text></g>)}
        {ticksX.map(tick => <g key={tick}><line x1={x(tick)} x2={x(tick)} y1={top} y2={H - bottom} stroke="#25334b" /><text x={x(tick)} y={H - bottom + 23} textAnchor="middle">{Math.round(tick)}</text></g>)}
        <text x={left} y={14} className="axis-title">COST / CREDITS</text>
        <text x={left + plotW / 2} y={H - 7} textAnchor="middle" className="axis-title">OVERALL RATING</text>
        <g clipPath={`url(#${clipId})`}>
          {summary.slope !== null && <line x1={x(summary.minRating)} x2={x(summary.maxRating)} y1={y(summary.cost + summary.slope * (summary.minRating - summary.rating))} y2={y(summary.cost + summary.slope * (summary.maxRating - summary.rating))} stroke="#eee5d5" strokeWidth={1.5} strokeDasharray="7 6" opacity={0.65} />}
          {summary.data.map(p => <circle key={p.id} cx={x(p.rating)} cy={y(p.price)} r={4.2} fill={COLORS[p.position]} fillOpacity={0.62} stroke="#101d32" strokeWidth={0.6}><title>{p.name}: {p.rating} OVR, {p.price} credits</title></circle>)}
          {selected && <g pointerEvents="none"><line x1={x(selected.rating)} x2={x(selected.rating)} y1={top} y2={H - bottom} stroke="#eee5d5" opacity={0.4} /><circle cx={x(selected.rating)} cy={y(selected.price)} r={8} fill={COLORS[selected.position]} stroke="#fff6e5" strokeWidth={2.5} /></g>}
        </g>
        {!summary.data.length && <text x={W / 2} y={H / 2} textAnchor="middle">No players in this selection</text>}
      </svg>
    </div>
    <div className="chart-inspector" aria-live="polite"><Crosshair size={19} /><div><strong>{selected?.name || 'Every dot is a player'}</strong><span>{selected ? `${selected.club} · ${selected.rating} OVR · ${selected.price} credits` : 'Hover or tap a dot to explore their value.'}</span></div></div>
    <label className="chart-select">Inspect a player<select aria-label="Inspect chart player" value={selected?.id || ''} onChange={e => setSelectedId(e.target.value)}><option value="">Choose from {summary.data.length} players</option>{summary.data.map(p => <option key={p.id} value={p.id}>{p.name} · {p.rating} OVR / {p.price} cr</option>)}</select></label>
    <div className="chart-stat-row"><div><span>AVG. RATING</span><strong>{summary.rating.toFixed(1)}<small>OVR</small></strong></div><div><span>AVG. COST</span><strong>{summary.cost.toFixed(0)}<small>CR</small></strong></div><div><span>CORRELATION</span><strong>{summary.correlation === null ? '—' : summary.correlation.toFixed(2)}<small>r</small></strong></div></div>
    <p className="chart-note"><span className="trend-key" />Dashed line: price trend · {summary.data.length} players · Game valuations</p>
  </section>;
}
