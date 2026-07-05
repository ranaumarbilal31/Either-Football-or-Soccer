import React from 'react';
import { Player } from '../types';
import { Star, Shield, Plus, Check, Eye } from 'lucide-react';
import { motion } from 'motion/react';

interface PlayerCardProps {
  key?: string;
  player: Player;
  onDraft?: (player: Player) => void;
  onRelease?: (player: Player) => void;
  onScout: (player: Player) => void;
  isDrafted: boolean;
  disabledDraft?: boolean;
}

export default function PlayerCard({
  player,
  onDraft,
  onRelease,
  onScout,
  isDrafted,
  disabledDraft,
}: PlayerCardProps) {
  const s = player.stats;

  return (
    <motion.div
      id={`player-card-${player.id}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className={`relative group bg-[#131316] border ${
        isDrafted ? 'border-[#3ECF8E]/40 bg-[#3ECF8E]/[0.02]' : 'border-white/[0.08] hover:border-white/[0.15]'
      } rounded-xl p-4 transition-all duration-300 flex flex-col justify-between`}
    >
      {/* Background radial accent */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none rounded-xl" />

      {/* Position and OVR Badge row */}
      <div className="flex items-start justify-between mb-3.5 z-10">
        <div className="flex items-center gap-1.5">
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase ${
              player.position === 'GK'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                : player.position === 'DEF'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                : player.position === 'MID'
                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                : 'bg-[#3ECF8E]/10 text-[#3ECF8E] border border-[#3ECF8E]/20'
            }`}
          >
            {player.position}
          </span>
          <span className="text-[10px] text-slate-500 font-mono tracking-tight leading-none">
            {player.nationality}
          </span>
        </div>

        <div className="flex flex-col items-end leading-none">
          <div className="text-xl font-black text-slate-200 flex items-baseline gap-0.5">
            {player.rating}
            <span className="text-[8px] font-mono text-slate-500 uppercase">OVR</span>
          </div>
        </div>
      </div>

      {/* Player details */}
      <div className="mb-4 z-10">
        <h3 className="text-sm font-semibold text-slate-200 tracking-tight truncate leading-snug">
          {player.name}
        </h3>
        <p className="text-[11px] font-mono text-slate-500 mt-0.5 truncate leading-none">
          {player.club}
        </p>
      </div>

      {/* Basic radar-style stats (Small metrics grid) */}
      <div className="grid grid-cols-3 gap-1.5 mb-4 border-t border-b border-white/[0.06] py-2 text-center z-10">
        <div className="flex flex-col">
          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Pace</span>
          <span className="text-[11px] font-mono font-semibold text-slate-300 mt-0.5">{s.pace}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Pass</span>
          <span className="text-[11px] font-mono font-semibold text-slate-300 mt-0.5">{s.passAccuracy}%</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Def</span>
          <span className="text-[11px] font-mono font-semibold text-slate-300 mt-0.5">{s.defense}</span>
        </div>
      </div>

      {/* Bottom Row: Price and Actions */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-1 z-10">
        <div className="flex flex-col leading-none">
          <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider">Cost</span>
          <span className="text-xs font-mono font-bold text-[#3ECF8E] mt-0.5">
            {player.price} <span className="text-[9px] text-slate-500">cr</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Scout Report Details Trigger */}
          <button
            onClick={() => onScout(player)}
            className="p-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 border border-white/[0.08] rounded-lg transition-all"
            title="View Scout Report"
            id={`scout-btn-${player.id}`}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Draft/Release Toggle */}
          {isDrafted ? (
            onRelease && (
              <button
                onClick={() => onRelease(player)}
                className="py-1 px-2.5 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 font-semibold text-[10px] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                id={`release-btn-${player.id}`}
              >
                <Check className="w-3 h-3 text-[#3ECF8E]" />
                Drafted
              </button>
            )
          ) : (
            onDraft && (
              <button
                onClick={() => !disabledDraft && onDraft(player)}
                disabled={disabledDraft}
                className={`py-1 px-2.5 rounded-lg font-semibold text-[10px] transition-all flex items-center gap-1 cursor-pointer ${
                  disabledDraft
                    ? 'bg-white/[0.02] text-slate-600 border border-white/[0.04] cursor-not-allowed'
                    : 'bg-[#3ECF8E]/10 hover:bg-[#3ECF8E] text-[#3ECF8E] hover:text-slate-950 border border-[#3ECF8E]/20'
                }`}
                id={`draft-btn-${player.id}`}
              >
                <Plus className="w-3 h-3" />
                Draft
              </button>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}
