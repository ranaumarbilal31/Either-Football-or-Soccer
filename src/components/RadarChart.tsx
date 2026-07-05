/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Player, PositionType } from '../types';
import { PositionAverages } from '../data/players';

interface RadarChartProps {
  player: Player;
  averageStats: typeof PositionAverages[PositionType];
}

interface AxisData {
  label: string;
  playerValue: number;
  averageValue: number;
}

export default function RadarChart({ player, averageStats }: RadarChartProps) {
  // Map player and average stats to standard axes (0 - 100 scale)
  const getAxesData = (): AxisData[] => {
    const p = player.stats;
    const a = averageStats;

    // Convert raw stats to standard 0-100 scale for comparison
    return [
      {
        label: 'Pace',
        playerValue: p.pace,
        averageValue: a.pace,
      },
      {
        label: 'Dribbling',
        playerValue: p.dribbling,
        averageValue: a.dribbling,
      },
      {
        label: 'Passing',
        playerValue: p.passAccuracy,
        averageValue: a.passAccuracy,
      },
      {
        label: 'Goal Threat',
        // Scale xG and goals
        playerValue: Math.min(Math.round(p.goals * 12 + p.xG90 * 80), 100) || Math.round((p.defense / 1.1)) % 100, // GK substitute
        averageValue: Math.min(Math.round(a.goals * 12 + a.xG90 * 80), 100) || Math.round((a.defense / 1.1)) % 100,
      },
      {
        label: 'Defending',
        playerValue: p.defense,
        averageValue: a.defense,
      },
      {
        label: 'Physicality',
        playerValue: Math.round((p.physicality + p.stamina) / 2),
        averageValue: Math.round((a.physicality + a.stamina) / 2),
      },
    ];
  };

  const axes = getAxesData();
  const numPoints = axes.length;
  const radius = 90;
  const cx = 130;
  const cy = 130;

  // Helpers to calculate SVG points
  const getCoordinates = (index: number, val: number) => {
    // Stat values are out of 100
    const factor = val / 100;
    const r = radius * factor;
    // Calculate angle (spread evenly around circle, starting from top)
    const angle = (Math.PI * 2 * index) / numPoints - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return { x, y };
  };

  // Build grid concentric hexagons (since numPoints = 6)
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPolygons = gridLevels.map((level) => {
    const points = Array.from({ length: numPoints })
      .map((_, i) => {
        const r = radius * level;
        const angle = (Math.PI * 2 * i) / numPoints - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        return `${x},${y}`;
      })
      .join(' ');
    return points;
  });

  // Calculate coordinates for Player and Positional Average
  const playerPoints = axes.map((axis, i) => getCoordinates(i, axis.playerValue));
  const playerPolygonString = playerPoints.map((p) => `${p.x},${p.y}`).join(' ');

  const avgPoints = axes.map((axis, i) => getCoordinates(i, axis.averageValue));
  const avgPolygonString = avgPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div id={`radar-${player.id}`} className="flex flex-col items-center bg-[#131316]/50 p-4 rounded-xl border border-white/[0.08]">
      <div className="text-center mb-2">
        <h4 className="text-xs font-mono tracking-wider text-slate-400 uppercase">Scout Performance Index</h4>
        <div className="flex items-center justify-center gap-4 mt-1 text-xs">
          <span className="flex items-center gap-1.5 text-[#3ECF8E] font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3ECF8E]/80 border border-[#3ECF8E]"></span>
            {player.name}
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600/80 border border-slate-500"></span>
            Positional Avg
          </span>
        </div>
      </div>

      <div className="relative w-[260px] h-[260px]">
        <svg viewBox="0 0 260 260" className="w-full h-full overflow-visible">
          {/* Grid lines */}
          {gridPolygons.map((points, index) => (
            <polygon
              key={index}
              points={points}
              fill="none"
              stroke="#334155"
              strokeWidth="0.75"
              strokeDasharray={index === 3 ? 'none' : '3 3'}
            />
          ))}

          {/* Grid Level Percent Labels */}
          {gridLevels.map((level, index) => {
            const angle = -Math.PI / 2; // top line
            const r = radius * level;
            const x = cx + r * Math.cos(angle) + 4;
            const y = cy + r * Math.sin(angle) - 4;
            return (
              <text
                key={index}
                x={x}
                y={y}
                fill="#475569"
                fontSize="8"
                fontFamily="monospace"
                textAnchor="start"
              >
                {Math.round(level * 100)}
              </text>
            );
          })}

          {/* Axes spokes and labels */}
          {axes.map((axis, i) => {
            const outerPoint = getCoordinates(i, 100);
            const labelDist = radius + 20;
            const angle = (Math.PI * 2 * i) / numPoints - Math.PI / 2;
            const labelX = cx + labelDist * Math.cos(angle);
            const labelY = cy + labelDist * Math.sin(angle);

            // Determine text alignment
            let textAnchor = 'middle';
            if (Math.cos(angle) > 0.1) textAnchor = 'start';
            else if (Math.cos(angle) < -0.1) textAnchor = 'end';

            return (
              <g key={i}>
                {/* Spoke line */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={outerPoint.x}
                  y2={outerPoint.y}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
                {/* Label text */}
                <text
                  x={labelX}
                  y={labelY + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="500"
                  fontFamily="sans-serif"
                  textAnchor={textAnchor}
                >
                  {axis.label}
                </text>
                {/* Small indicator on axes for values */}
                <circle cx={outerPoint.x} cy={outerPoint.y} r="1.5" fill="#475569" />
              </g>
            );
          })}

          {/* Average Polygon (Background) */}
          <polygon
            points={avgPolygonString}
            fill="rgba(71, 85, 105, 0.2)"
            stroke="rgba(148, 163, 184, 0.6)"
            strokeWidth="1.5"
          />

          {/* Player Polygon (Foreground) */}
          <polygon
            points={playerPolygonString}
            fill="rgba(62, 207, 142, 0.25)"
            stroke="rgba(62, 207, 142, 0.85)"
            strokeWidth="2"
          />

          {/* Player Vertices Dots */}
          {playerPoints.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="4"
                fill="#3ECF8E"
                stroke="#3ECF8E"
                strokeWidth="1.5"
              />
              <title>{`${axes[i].label}: ${axes[i].playerValue}`}</title>
            </g>
          ))}
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2 w-full mt-3 border-t border-white/[0.08] pt-3">
        {axes.map((axis, i) => {
          const diff = axis.playerValue - axis.averageValue;
          return (
            <div key={i} className="flex flex-col items-center p-1.5 bg-[#0A0A0C]/40 rounded border border-white/[0.03]">
              <span className="text-[9px] font-mono tracking-wider text-slate-500 uppercase">{axis.label}</span>
              <span className="text-xs font-semibold text-slate-200 mt-0.5">{axis.playerValue}</span>
              <span className={`text-[9px] font-mono mt-0.5 ${diff >= 0 ? 'text-[#3ECF8E]' : 'text-rose-400'}`}>
                {diff >= 0 ? `+${diff}` : diff}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
