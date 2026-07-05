import React from 'react';
import { createPortal } from 'react-dom';
import { Player, PositionType, FormationType } from '../types';
import { getFormationLayout, PitchNode } from '../utils/formations';
import { Trash2, Award, PlusCircle, Info, Star, X } from 'lucide-react';
import { calculateSquadChemistry } from '../utils/chemistry';
import { motion } from 'motion/react';

interface SquadPitchProps {
  players: Player[];
  formation: FormationType;
  onRelease: (player: Player) => void;
  onScout: (player: Player) => void;
  onFocusSearch: (position: PositionType) => void;
  slotAssignments?: Record<string, string>;
  onAssignSlot?: (slotId: string, playerId: string | null) => void;
  onSwapSlots?: (slotIdA: string, slotIdB: string) => void;
  onPositionChange?: (player: Player, newPosition: string) => void;
}

export default function SquadPitch({
  players,
  formation,
  onRelease,
  onScout,
  onFocusSearch,
  slotAssignments = {},
  onAssignSlot,
  onSwapSlots,
  onPositionChange,
}: SquadPitchProps) {
  const layout = getFormationLayout(formation);
  const [selectedSlotId, setSelectedSlotId] = React.useState<string | null>(null);
  const [showPositionSelector, setShowPositionSelector] = React.useState<{ slotId: string; x: number; y: number } | null>(null);
  const [swapError, setSwapError] = React.useState<string | null>(null);

  // A player can only occupy a slot if the GK-ness of the player matches the
  // GK-ness of the slot. This is the single source of truth for the rule
  // "a goalkeeper can only be substituted by another goalkeeper".
  const canOccupySlot = React.useCallback((player: Player | null, slot: PitchNode | undefined) => {
    if (!player || !slot) return true; // nothing to place / unknown slot -> no conflict
    const isPlayerGK = player.position === 'GK';
    const isSlotGK = slot.positionType === 'GK';
    return isPlayerGK === isSlotGK;
  }, []);

  // Distribute currently drafted players into formation slots
  const mapPlayersToSlots = (): { slot: PitchNode; player: Player | null }[] => {
    // If we have explicit slot assignments, use them!
    if (Object.keys(slotAssignments).length > 0) {
      return layout.map((slot) => {
        const assignedPlayerId = slotAssignments[slot.id];
        const player = assignedPlayerId ? players.find((p) => p.id === assignedPlayerId) || null : null;
        return { slot, player };
      });
    }

    // Fallback: automatic sequential distribution
    const placedPlayerIds = new Set<string>();
    return layout.map((slot) => {
      const matchingPlayer = players.find(
        (p) => p.position === slot.positionType && !placedPlayerIds.has(p.id)
      );

      if (matchingPlayer) {
        placedPlayerIds.add(matchingPlayer.id);
        return { slot, player: matchingPlayer };
      }

      return { slot, player: null };
    });
  };

  const slotsWithPlayers = mapPlayersToSlots();

  // Handle swapping two slots
  const handleSwap = (slotIdA: string, slotIdB: string) => {
    const slotA = layout.find((s) => s.id === slotIdA);
    const slotB = layout.find((s) => s.id === slotIdB);

    const playerAId = slotAssignments[slotIdA] || null;
    const playerBId = slotAssignments[slotIdB] || null;
    const playerA = playerAId ? players.find((p) => p.id === playerAId) || null : null;
    const playerB = playerBId ? players.find((p) => p.id === playerBId) || null : null;

    // Enforce the GK rule in both directions: a GK can only land in a GK
    // slot, and a GK slot can only ever hold a GK.
    if (!canOccupySlot(playerA, slotB) || !canOccupySlot(playerB, slotA)) {
      setSwapError('Goalkeepers can only be swapped with other goalkeepers.');
      return;
    }

    setSwapError(null);

    if (onSwapSlots) {
      onSwapSlots(slotIdA, slotIdB);
    } else if (onAssignSlot) {
      onAssignSlot(slotIdA, playerBId);
      onAssignSlot(slotIdB, playerAId);
    }
    setSelectedSlotId(null);
  };

  const handleSlotClick = (slotId: string, hasPlayer: boolean) => {
    if (selectedSlotId === null) {
      if (hasPlayer) {
        setSwapError(null);
        setSelectedSlotId(slotId);
      } else {
        // If empty and not selecting, focus search
        const clickedSlot = layout.find(s => s.id === slotId);
        if (clickedSlot) onFocusSearch(clickedSlot.positionType);
      }
    } else {
      if (selectedSlotId === slotId) {
        setSelectedSlotId(null);
        setSwapError(null);
      } else {
        handleSwap(selectedSlotId, slotId);
      }
    }
  };

  // Calculate Chemistry Stats using the single source of truth:
  const chemistry = calculateSquadChemistry(players, formation, slotAssignments);

  // Get average squad rating
  const getAverageRating = () => {
    if (players.length === 0) return 0;
    const total = players.reduce((acc, p) => acc + p.rating, 0);
    return Math.round(total / players.length);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col h-full bg-[#131316] border border-white/[0.08] rounded-2xl overflow-hidden relative shadow-2xl"
    >
      {/* Pitch Header Metrics */}
      <div className="bg-[#131316] border-b border-white/[0.08] p-4 flex items-center justify-between z-10">
        <div>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Dynamic Squad Metrics</span>
          <h3 className="text-sm font-semibold text-slate-200 mt-0.5">Active Formulation: {formation}</h3>
          {!selectedSlotId && (
            <p className="text-[11px] font-mono text-slate-500 tracking-wide mt-1">
              Click a player to swap positions, click an empty slot to search
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end leading-none">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">OVR Rating</span>
            <span className="text-lg font-black text-slate-100 mt-1 flex items-baseline gap-0.5">
              {getAverageRating()}
              <span className="text-[10px] font-mono text-slate-500">OVR</span>
            </span>
          </div>

          <div className="h-6 w-px bg-white/[0.08]" />

          <div className="flex flex-col items-end leading-none">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Tactical Chem</span>
            <span className={`text-lg font-black mt-1 flex items-baseline gap-0.5 ${
              chemistry >= 70 ? 'text-[#3ECF8E]' : chemistry >= 40 ? 'text-amber-400' : 'text-slate-400'
            }`}>
              {chemistry}
              <span className="text-[10px] font-mono text-slate-500">%</span>
            </span>
          </div>
        </div>
      </div>

      {/* The 2D Tactical Field Stage */}
      <div className="flex-1 relative min-h-[460px] bg-gradient-to-b from-[#0A0A0C] via-[#0D0D10] to-[#131316] border-b border-white/[0.08] flex items-center justify-center p-4 overflow-hidden select-none">
        {/* Swapping Instructions overlay banner */}
        {selectedSlotId && (() => {
          const selectedSlot = layout.find(s => s.id === selectedSlotId);
          const selectedPlayerId = slotAssignments[selectedSlotId];
          const selectedPlayer = selectedPlayerId ? players.find(p => p.id === selectedPlayerId) : null;
          return (
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-[#131316] border px-3.5 py-1.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-mono ${
              swapError ? 'border-rose-500/40' : 'border-[#3ECF8E]/30'
            }`}>
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${swapError ? 'bg-rose-500' : 'bg-[#3ECF8E]'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${swapError ? 'bg-rose-500' : 'bg-[#3ECF8E]'}`}></span>
              </span>
              {swapError ? (
                <span className="text-rose-300">{swapError}</span>
              ) : (
                <span className="text-slate-300">
                  Click another slot to move/swap <strong className="text-[#3ECF8E]">{selectedPlayer?.name.split(' ').pop() || 'Player'}</strong> ({selectedSlot?.label})
                </span>
              )}
              <button 
                onClick={() => { setSelectedSlotId(null); setSwapError(null); }}
                className="ml-2 text-slate-500 hover:text-slate-200 font-bold px-1 rounded hover:bg-white/[0.08]"
              >
                ✕
              </button>
            </div>
          );
        })()}

        {/* Field lines representation (SVG layer) */}
        <div className="absolute inset-4 opacity-15 pointer-events-none z-0">
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Outer boundary */}
            <rect x="0" y="0" width="100" height="100" fill="none" stroke="#3ECF8E" strokeWidth="1" strokeOpacity="0.3" />
            {/* Halfway line */}
            <line x1="0" y1="50" x2="100" y2="50" stroke="#3ECF8E" strokeWidth="1" strokeOpacity="0.3" />
            {/* Center circle */}
            <circle cx="50" cy="50" r="15" fill="none" stroke="#3ECF8E" strokeWidth="1" strokeOpacity="0.3" />
            <circle cx="50" cy="50" r="1" fill="#3ECF8E" fillOpacity="0.5" />
            {/* Penalty boxes */}
            {/* Top Box (Away team side) */}
            <rect x="20" y="0" width="60" height="18" fill="none" stroke="#3ECF8E" strokeWidth="1" strokeOpacity="0.3" />
            <rect x="35" y="0" width="30" height="6" fill="none" stroke="#3ECF8E" strokeWidth="1" strokeOpacity="0.3" />
            <path d="M 40 18 Q 50 23 60 18" fill="none" stroke="#3ECF8E" strokeWidth="1" strokeOpacity="0.3" />
            {/* Bottom Box (Home team side) */}
            <rect x="20" y="82" width="60" height="18" fill="none" stroke="#3ECF8E" strokeWidth="1" strokeOpacity="0.3" />
            <rect x="35" y="94" width="30" height="6" fill="none" stroke="#3ECF8E" strokeWidth="1" strokeOpacity="0.3" />
            <path d="M 40 82 Q 50 77 60 82" fill="none" stroke="#3ECF8E" strokeWidth="1" strokeOpacity="0.3" />
          </svg>
        </div>

        {/* Players / Placeholders Nodes Container */}
        <div className="absolute inset-0 z-10">
          {slotsWithPlayers.map(({ slot, player }) => (
            <div
              key={slot.id}
              style={{
                position: 'absolute',
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className="transition-all duration-500 ease-out"
              id={`slot-${slot.id}`}
            >
              {player ? (
                /* Drafted Player Node */
                <div className="flex flex-col items-center">
                  <div className="relative group/node flex flex-col items-center">
                    {/* Compact node circle, wrapped tightly so the actions popup anchors to it, not the name label below */}
                    <div className="relative">
                      <button
                        onClick={() => handleSlotClick(slot.id, true)}
                        className={`w-12 h-12 rounded-full bg-[#131316] border-2 text-slate-100 flex items-center justify-center font-black text-sm transition-all shadow-lg hover:shadow-[#3ECF8E]/10 shadow-black cursor-pointer ${
                          selectedSlotId === slot.id
                            ? 'border-[#3ECF8E] ring-4 ring-[#3ECF8E]/40 ring-offset-2 ring-offset-[#0A0A0C] scale-110 animate-pulse'
                            : selectedSlotId
                              ? 'border-amber-500/50 hover:border-[#3ECF8E] hover:scale-105'
                              : 'border-[#3ECF8E]/80 hover:border-[#3ECF8E] hover:scale-105'
                        }`}
                        id={`pitch-node-${player.id}`}
                      >
                        {player.rating}
                      </button>

                      {/* Player Actions - shown for the selected player, confined to the pitch itself */}
                      {selectedSlotId === slot.id && (
                        <div
                          className={`absolute left-1/2 -translate-x-1/2 z-30 pointer-events-auto ${
                            slot.y < 25 ? 'top-full mt-2' : 'bottom-full mb-2'
                          }`}
                        >
                          <div className="bg-[#131316] border border-[#3ECF8E]/30 rounded-xl p-2 flex items-center gap-1 shadow-2xl whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setShowPositionSelector(showPositionSelector?.slotId === slot.id ? null : { slotId: slot.id, x: rect.left, y: rect.top });
                              }}
                              className="p-1 hover:bg-[#3ECF8E]/15 text-[#3ECF8E] hover:text-[#3ECF8E] rounded cursor-pointer"
                              title="Change Position"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onScout(player);
                              }}
                              className="p-1 hover:bg-[#3ECF8E]/15 text-[#3ECF8E] hover:text-[#3ECF8E] rounded cursor-pointer"
                              title="Detailed Scout Report"
                            >
                              <Info className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRelease(player);
                                setSelectedSlotId(null);
                                setSwapError(null);
                              }}
                              className="p-1 hover:bg-rose-500/15 text-rose-400 hover:text-rose-300 rounded cursor-pointer"
                              title="Release Player"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Player Label Text block */}
                    <div className="mt-1 bg-[#131316]/95 border border-white/[0.08] rounded py-0.5 px-2 text-center shadow shadow-black min-w-[70px] max-w-[100px] z-10 pointer-events-none">
                      <p className="text-[10px] font-bold text-slate-200 truncate leading-tight">
                        {player.name.split(' ').pop()}
                      </p>
                      <p className="text-[8px] font-mono text-[#3ECF8E] leading-none mt-0.5">
                        {slot.label}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty Position Placeholder */
                <button
                  onClick={() => handleSlotClick(slot.id, false)}
                  className={`flex flex-col items-center group cursor-pointer transition-transform ${
                    selectedSlotId ? 'scale-105' : ''
                  }`}
                  id={`pitch-empty-${slot.id}`}
                >
                  <div className={`w-10 h-10 rounded-full border border-dashed flex items-center justify-center transition-all ${
                    selectedSlotId 
                      ? 'border-[#3ECF8E]/80 animate-pulse bg-[#3ECF8E]/10' 
                      : 'border-white/[0.15] bg-[#131316]/40 hover:bg-[#131316]/85 hover:border-white/[0.3]'
                  }`}>
                    <PlusCircle className={`w-4 h-4 transition-transform ${
                      selectedSlotId ? 'text-[#3ECF8E] rotate-45 scale-110' : 'text-slate-600 group-hover:text-slate-400'
                    }`} />
                  </div>
                  <span className="mt-1 text-[8px] font-mono text-slate-500 group-hover:text-slate-300 transition-colors bg-[#0A0A0C]/40 px-1 rounded">
                    {slot.label}
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Field Footer Panel: Squad constraints check */}
      <div className="bg-[#131316] p-4 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono text-slate-500 z-10">
        <span className="flex items-center gap-1.5">
          <Award className="w-4 h-4 text-[#3ECF8E]" />
          Manager Squad validation:
        </span>
        <span className={players.length === 11 ? 'text-[#3ECF8E] font-bold' : 'text-slate-400'}>
          {players.length} / 11 Players Drafted
        </span>
      </div>

      {/* Position Selector Portal */}
      {showPositionSelector && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowPositionSelector(null)}
        >
          <div 
            className="bg-[#131316] border border-[#3ECF8E]/30 rounded-xl p-4 shadow-2xl min-w-[200px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono text-[#8A8A93] uppercase tracking-wider">Change Position</span>
              <button
                onClick={() => setShowPositionSelector(null)}
                className="p-1 hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['GK', 'DEF', 'MID', 'FWD'].map(pos => {
                const currentPlayer = slotsWithPlayers.find(s => s.slot.id === showPositionSelector.slotId)?.player;
                if (!currentPlayer) return null;
                
                // GK validation: prevent non-GK from changing to GK position
                const isGKPosition = pos === 'GK';
                const isCurrentPlayerGK = currentPlayer.position === 'GK';
                const canChangePosition = !isGKPosition || (isGKPosition && isCurrentPlayerGK);
                
                return (
                  <button
                    key={pos}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canChangePosition && onPositionChange) {
                        onPositionChange(currentPlayer, pos);
                      }
                      setShowPositionSelector(null);
                    }}
                    disabled={!canChangePosition}
                    className={`py-2 px-3 rounded-lg text-sm font-mono font-bold transition-all cursor-pointer ${
                      currentPlayer.position === pos 
                        ? 'bg-[#3ECF8E] text-slate-950 border border-[#3ECF8E]' 
                        : canChangePosition
                          ? 'bg-[#0A0A0C] hover:bg-[#3ECF8E] hover:text-slate-950 border border-white/[0.08] hover:border-[#3ECF8E] text-[#F2F2F0]'
                          : 'bg-[#0A0A0C]/30 border-white/[0.04] text-slate-600 cursor-not-allowed opacity-50'
                    }`}
                    title={canChangePosition ? `Change to ${pos}` : 'Only goalkeepers can play in GK position'}
                  >
                    {pos}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

    </motion.div>
  );
}
