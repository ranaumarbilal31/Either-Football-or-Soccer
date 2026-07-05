/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Player } from '../types';
import { PositionAverages } from '../data/players';
import RadarChart from './RadarChart';
import { X, TrendingUp, ShieldAlert, Award, Star, Zap } from 'lucide-react';

interface ScoutReportProps {
  player: Player;
  onClose: () => void;
  onDraft?: () => void;
  onRelease?: () => void;
  isDrafted?: boolean;
}

export default function ScoutReport({ player, onClose, onDraft, onRelease, isDrafted }: ScoutReportProps) {
  const avgStats = PositionAverages[player.position];

  // Dynamic scouting commentary based on position and key stats
  const getScoutInsights = (): string => {
    const s = player.stats;
    if (player.position === 'GK') {
      return `${player.name} is an elite shot-stopper with a rating of ${player.rating}. Their reflexes (Defending: ${s.defense}) rank in the top percentile. With ${s.passAccuracy}% pass accuracy, they act as a vital ${player.playstyles.includes('Sweeper Keeper') ? 'sweeper-keeper' : 'possession anchor'}, facilitating rapid transitions from the back. Recommended for systems utilizing a High Defensive Line.`;
    }

    if (player.position === 'DEF') {
      const defensiveStyle = s.defense >= 88 ? 'world-class destroyer' : 'versatile modern fullback';
      const playstyleNotes = player.playstyles.includes('Ball Playing Defender') 
        ? 'outstanding build-up capabilities and superb vision (Pass Accuracy: 90%+)' 
        : 'tenacious ball recovery and structural positioning';
      return `${player.name} (${player.rating} OVR) is a ${defensiveStyle} featuring ${playstyleNotes}. Their physical presence (${s.physicality} PHYS) makes them highly formidable in aerial duels and physical contests. A perfect anchor for deep defensive strategies or aggressive high pressing setups.`;
    }

    if (player.position === 'MID') {
      const creativeRating = s.passAccuracy + (s.assists * 3);
      const outputInsights = creativeRating >= 110 
        ? `outstanding playmaking capacity with a remarkable ${s.passAccuracy}% pass accuracy and ${s.xA90} xA90 baseline` 
        : `relentless engine capacity with ${s.stamina} stamina and balanced defensive/offensive attributes`;
      return `${player.name} operates as a high-octane midfielder. They boast ${outputInsights}. Utilizing complementary playstyles like ${player.playstyles.slice(0, 2).join(' & ')}, they excel at managing tempo, driving the ball transitionally, and breaking defensive clusters.`;
    }

    // FWD
    const goalThreat = s.goals + s.xG90 * 10;
    const styleInsights = goalThreat >= 40 
      ? `lethal penalty box assassin, logging a staggering ${s.xG90} expected goals (xG) per 90. They are a pure offensive focal point` 
      : `highly dynamic attacker capable of fluid wing overlaps, generating ${s.assists} assists with ${s.xA90} expected assist creations per match`;
    return `${player.name} is a high-impact forward rating ${player.rating} OVR. They represent a ${styleInsights}. Their physical pacing (${s.pace} PACE) allows them to exploit open counters, making them highly threatening against high-defensive blocks.`;
  };

  // Sparkline calculation for form trends
  const renderFormSparkline = () => {
    const form = player.recentForm;
    const width = 180;
    const height = 40;
    const padding = 6;
    
    // Scale coords
    const minVal = 6.0;
    const maxVal = 9.5;
    const points = form.map((rating, index) => {
      const x = padding + (index * (width - padding * 2)) / (form.length - 1);
      const ratio = (rating - minVal) / (maxVal - minVal);
      const y = height - padding - ratio * (height - padding * 2);
      return { x, y };
    });

    const pathString = `M ${points.map((p) => `${p.x} ${p.y}`).join(' L ')}`;

    return (
      <div className="flex flex-col bg-[#0A0A0C]/40 p-3 rounded-lg border border-white/[0.08]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-[#8A8A93] uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#3ECF8E]" />
            Recent Form Trend
          </span>
          <span className="text-xs font-mono font-bold text-[#F2F2F0]">
            Avg: {(form.reduce((a, b) => a + b, 0) / form.length).toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <svg width={width} height={height} className="overflow-visible">
            {/* Base line */}
            <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#1F1F24" strokeWidth="0.5" strokeDasharray="3 3" />
            {/* Gradient Area under line */}
            <path
              d={`${pathString} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`}
              fill="url(#sparkline-grad)"
              opacity="0.1"
            />
            {/* Sparkline */}
            <path d={pathString} fill="none" stroke="#3ECF8E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Dots */}
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="3.5" fill="#0A0A0C" stroke="#3ECF8E" strokeWidth="1.5" />
                <text x={p.x} y={p.y - 6} fill="#F2F2F0" fontSize="8" textAnchor="middle" fontWeight="bold">
                  {form[i].toFixed(1)}
                </text>
              </g>
            ))}
            {/* Defs */}
            <defs>
              <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3ECF8E" />
                <stop offset="100%" stopColor="#3ECF8E" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-mono text-[#8A8A93] uppercase">Status</span>
            <span className="text-xs font-semibold text-[#3ECF8E] flex items-center gap-1 mt-0.5 justify-end">
              <Star className="w-3.5 h-3.5 fill-[#3ECF8E]/25" /> Active
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id={`scout-report-overlay-${player.id}`} className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0C]/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl bg-[#131316] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        {/* Left pane: Player Header Card & Radar Chart */}
        <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-white/[0.08] overflow-y-auto">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                  player.position === 'GK' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  player.position === 'DEF' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                  player.position === 'MID' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                  'bg-[#3ECF8E]/10 text-[#3ECF8E] border border-[#3ECF8E]/20'
                }`}>
                  {player.position}
                </span>
                <span className="text-xs text-[#8A8A93] font-mono">{player.club} • {player.nationality}</span>
              </div>
              <h2 className="text-2xl font-bold text-[#F2F2F0] tracking-tight mt-1">{player.name}</h2>
            </div>
            
            <div className="flex flex-col items-end">
              <div className="text-3xl font-extrabold text-[#F2F2F0] flex items-baseline gap-1">
                {player.rating}
                <span className="text-xs font-mono text-[#8A8A93] uppercase tracking-wider">OVR</span>
              </div>
              <span className="text-xs font-mono text-[#3ECF8E] mt-1 font-semibold">{player.price} CREDITS</span>
            </div>
          </div>

          <div className="flex justify-center my-6">
            <RadarChart player={player} averageStats={avgStats} />
          </div>
        </div>

        {/* Right pane: Advanced stats, Sparkline, Insights & Actions */}
        <div className="w-full md:w-[420px] p-6 bg-[#0A0A0C]/40 flex flex-col justify-between overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#8A8A93] hover:text-[#F2F2F0] transition-colors border border-white/[0.08]"
            id={`close-scout-report-${player.id}`}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-mono text-[#8A8A93] uppercase tracking-wider mb-2">Technical Profile</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0A0A0C]/30 p-2.5 rounded-lg border border-white/[0.08] flex items-center justify-between">
                  <span className="text-xs text-[#8A8A93] font-medium">Pace</span>
                  <span className="text-sm font-mono font-bold text-[#F2F2F0]">{player.stats.pace}</span>
                </div>
                <div className="bg-[#0A0A0C]/30 p-2.5 rounded-lg border border-white/[0.08] flex items-center justify-between">
                  <span className="text-xs text-[#8A8A93] font-medium">Dribbling</span>
                  <span className="text-sm font-mono font-bold text-[#F2F2F0]">{player.stats.dribbling}</span>
                </div>
                <div className="bg-[#0A0A0C]/30 p-2.5 rounded-lg border border-white/[0.08] flex items-center justify-between">
                  <span className="text-xs text-[#8A8A93] font-medium">Pass Accuracy</span>
                  <span className="text-sm font-mono font-bold text-[#F2F2F0]">{player.stats.passAccuracy}%</span>
                </div>
                <div className="bg-[#0A0A0C]/30 p-2.5 rounded-lg border border-white/[0.08] flex items-center justify-between">
                  <span className="text-xs text-[#8A8A93] font-medium">Stamina</span>
                  <span className="text-sm font-mono font-bold text-[#F2F2F0]">{player.stats.stamina}</span>
                </div>
                {player.position !== 'GK' ? (
                  <>
                    <div className="bg-[#0A0A0C]/30 p-2.5 rounded-lg border border-white/[0.08] flex items-center justify-between">
                      <span className="text-xs text-[#8A8A93] font-medium">xG / 90</span>
                      <span className="text-sm font-mono font-bold text-[#3ECF8E]">{player.stats.xG90.toFixed(2)}</span>
                    </div>
                    <div className="bg-[#0A0A0C]/30 p-2.5 rounded-lg border border-white/[0.08] flex items-center justify-between">
                      <span className="text-xs text-[#8A8A93] font-medium">xA / 90</span>
                      <span className="text-sm font-mono font-bold text-blue-400">{player.stats.xA90.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-[#0A0A0C]/30 p-2.5 rounded-lg border border-white/[0.08] flex items-center justify-between">
                      <span className="text-xs text-[#8A8A93] font-medium">GK Reflexes</span>
                      <span className="text-sm font-mono font-bold text-amber-400">{player.stats.defense}</span>
                    </div>
                    <div className="bg-[#0A0A0C]/30 p-2.5 rounded-lg border border-white/[0.08] flex items-center justify-between">
                      <span className="text-xs text-[#8A8A93] font-medium">Pass Launching</span>
                      <span className="text-sm font-mono font-bold text-[#F2F2F0]">{player.stats.passAccuracy}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Sparkline for recent form */}
            {renderFormSparkline()}

            {/* Playstyle traits */}
            <div>
              <h3 className="text-xs font-mono text-[#8A8A93] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                Aesthetic playstyles
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {player.playstyles.map((style, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-[#0A0A0C]/50 hover:bg-[#0A0A0C]/80 transition-colors border border-white/[0.08] text-[10px] font-mono text-[#F2F2F0] rounded flex items-center gap-1"
                  >
                    <Award className="w-3 h-3 text-amber-500" />
                    {style}
                  </span>
                ))}
              </div>
            </div>

            {/* Scout insights summary */}
            <div className="bg-[#0A0A0C]/25 p-3.5 rounded-lg border border-white/[0.08]">
              <span className="text-xs font-mono text-[#8A8A93] uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                Scout Insights
              </span>
              <p className="text-xs text-[#8A8A93] leading-relaxed font-normal">
                {getScoutInsights()}
              </p>
            </div>
          </div>

          {/* Action buttons (Draft/Release) */}
          <div className="mt-6 pt-4 border-t border-white/[0.08] flex gap-3">
            {isDrafted ? (
              onRelease && (
                <button
                  onClick={() => {
                    onRelease();
                    onClose();
                  }}
                  className="flex-1 py-2.5 px-4 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 hover:border-rose-500/50 text-rose-300 font-medium text-xs rounded-xl transition-all font-sans cursor-pointer shadow-lg hover:shadow-rose-950/10"
                  id={`scout-release-btn-${player.id}`}
                >
                  Release from Squad
                </button>
              )
            ) : (
              onDraft && (
                <button
                  onClick={() => {
                    onDraft();
                    onClose();
                  }}
                  className="flex-1 py-2.5 px-4 bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg hover:shadow-[#3ECF8E]/20 font-sans cursor-pointer"
                  id={`scout-draft-btn-${player.id}`}
                >
                  Draft to Squad
                </button>
              )
            )}
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-[#F2F2F0] border border-white/[0.08] text-xs font-medium rounded-xl transition-all font-sans cursor-pointer"
              id="scout-close-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
