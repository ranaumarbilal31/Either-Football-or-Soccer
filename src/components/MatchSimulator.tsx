import React, { useState, useEffect, useRef } from 'react';
import { Player, Tactics, MatchResult, MatchEvent } from '../types';
import { OPPOSITION_TEAMS, OppositionSquad, simulateMatch } from '../utils/simulation';
import { 
  Play, 
  Pause, 
  FastForward, 
  ChevronRight, 
  Trophy, 
  User, 
  TrendingUp, 
  FileText, 
  Compass, 
  Zap, 
  Flame,
  ArrowRight,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MatchSimulatorProps {
  players: Player[];
  tactics: Tactics;
  chemistry: number;
  slotAssignments: Record<string, string>;
  onSimulationComplete: (result: MatchResult) => void;
  onBack: () => void;
}

export default function MatchSimulator({
  players,
  tactics,
  chemistry,
  slotAssignments,
  onSimulationComplete,
  onBack,
}: MatchSimulatorProps) {
  const [selectedOpponent, setSelectedOpponent] = useState<OppositionSquad>(() => {
    return OPPOSITION_TEAMS.find(t => t.type === 'CLUB') || OPPOSITION_TEAMS[0];
  });
  const [opponentTab, setOpponentTab] = useState<'CLUB' | 'INTERNATIONAL'>('CLUB');
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Set first opponent of selected category when tab changes
  useEffect(() => {
    const list = OPPOSITION_TEAMS.filter(t => t.type === opponentTab);
    if (list.length > 0 && !list.some(t => t.name === selectedOpponent.name)) {
      setSelectedOpponent(list[0]);
    }
  }, [opponentTab]);

  const [simSpeed, setSimSpeed] = useState<number>(166); // ms per simulated minute (166 * 90 mins = ~15 seconds)
  const [currentMinute, setCurrentMinute] = useState(0);
  const [liveScore, setLiveScore] = useState({ home: 0, away: 0 });
  const [simEvents, setSimEvents] = useState<MatchEvent[]>([]);
  const [runningStamina, setRunningStamina] = useState<Record<string, number>>({});
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const commentaryEndRef = useRef<HTMLDivElement | null>(null);
  const activeMatchResultRef = useRef<MatchResult | null>(null);

  // Initialize player stamina when opponent is selected or loaded
  useEffect(() => {
    const stamina: Record<string, number> = {};
    players.forEach(p => {
      stamina[p.id] = p.stats.stamina;
    });
    setRunningStamina(stamina);
  }, [players, selectedOpponent]);

  // Scroll commentary to bottom on update
  useEffect(() => {
    if (commentaryEndRef.current) {
      commentaryEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [simEvents]);

  // Handle minute-by-minute execution
  const startSimulation = () => {
    // Generate the full match result instantly, then stream it minute by minute
    const result = simulateMatch(players, tactics, selectedOpponent, chemistry, slotAssignments);
    activeMatchResultRef.current = result;
    setMatchResult(result);
    
    setIsSimulating(true);
    setCurrentMinute(0);
    setLiveScore({ home: 0, away: 0 });
    setSimEvents([]);
    
    // Set initial stamina
    const initStamina: Record<string, number> = {};
    players.forEach(p => {
      initStamina[p.id] = p.stats.stamina;
    });
    setRunningStamina(initStamina);
  };

  useEffect(() => {
    if (isSimulating) {
      timerRef.current = setInterval(() => {
        setCurrentMinute((prev) => {
          if (prev >= 90) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 90;
          }
          return prev + 1;
        });
      }, simSpeed);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSimulating, simSpeed]);

  // Handle side-effects of minute changes (events, scores, and stamina decay)
  useEffect(() => {
    if (isSimulating && currentMinute > 0 && currentMinute <= 90) {
      const currentMatch = activeMatchResultRef.current;
      if (!currentMatch) return;

      // Check if there are events in this minute
      const minEvents = currentMatch.events.filter(e => e.minute === currentMinute);
      if (minEvents.length > 0) {
        setSimEvents((prevEvents) => {
          // Guard against adding the same events multiple times (e.g. during StrictMode re-renders)
          const alreadyContains = prevEvents.some(
            (existing) => existing.minute === currentMinute && minEvents.some((m) => m.description === existing.description)
          );
          if (alreadyContains) return prevEvents;
          return [...prevEvents, ...minEvents];
        });

        // Update scores deterministically by counting ALL goals up to currentMinute
        const goals = minEvents.filter(e => e.type === 'GOAL');
        if (goals.length > 0) {
          setLiveScore(() => {
            let homeG = 0;
            let awayG = 0;
            const allGoalsSoFar = currentMatch.events.filter(e => e.minute <= currentMinute && e.type === 'GOAL');
            allGoalsSoFar.forEach(g => {
              if (g.team === 'HOME') homeG += 1;
              if (g.team === 'AWAY') awayG += 1;
            });
            return { home: homeG, away: awayG };
          });
        }
      }

      // Update stamina decay dynamically based on tactics pressing intensity
      setRunningStamina((prevStamina) => {
        const nextStamina = { ...prevStamina };
        players.forEach(p => {
          const rate = 0.4 + (tactics.pressingIntensity / 120);
          nextStamina[p.id] = Math.max((prevStamina[p.id] || p.stats.stamina) - rate, 5);
        });
        return nextStamina;
      });
    }
  }, [currentMinute, isSimulating, players, tactics.pressingIntensity]);

  // Handle match simulation completion safely in a separate effect
  useEffect(() => {
    if (currentMinute >= 90 && isSimulating && matchResult) {
      setIsSimulating(false);
      onSimulationComplete(matchResult);
    }
  }, [currentMinute, isSimulating, matchResult, onSimulationComplete]);

  const handleInstantSimulate = () => {
    const result = simulateMatch(players, tactics, selectedOpponent, chemistry, slotAssignments);
    onSimulationComplete(result);
  };

  return (
    <div className="bg-[#131316] border border-white/[0.08] rounded-3xl p-6 shadow-2xl relative overflow-hidden" id="match-simulator-container">
      {/* Visual Ambient Field Ring */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#3ECF8E]/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/[0.08] pb-5 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#3ECF8E]" />
            <h2 className="text-xl font-black tracking-tight text-[#F2F2F0]">Tactical Match Simulation</h2>
          </div>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Markov chain probability models engine • Live commentary and stamina calculations
          </p>
        </div>

        {!isSimulating && currentMinute === 0 && (
          <button
            onClick={onBack}
            className="text-xs font-mono py-1.5 px-3.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            id="back-to-draft-btn"
          >
            ← Back to Draft Hub
          </button>
        )}
      </div>

      {/* Opponent Selection vs Live Field */}
      {!isSimulating && currentMinute === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Opposition selection Cards */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-2">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#3ECF8E] rounded-full animate-ping" />
                Select Opposition Team
              </h3>
              <div className="flex bg-[#0A0A0C] p-1 border border-white/[0.08] rounded-xl gap-1 self-start sm:self-auto">
                <button
                  onClick={() => setOpponentTab('CLUB')}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                    opponentTab === 'CLUB'
                      ? 'bg-[#3ECF8E] text-[#0A0A0C] font-bold shadow-md shadow-[#3ECF8E]/10'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Clubs
                </button>
                <button
                  onClick={() => setOpponentTab('INTERNATIONAL')}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                    opponentTab === 'INTERNATIONAL'
                      ? 'bg-[#3ECF8E] text-[#0A0A0C] font-bold shadow-md shadow-[#3ECF8E]/10'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Nations
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[360px] overflow-y-auto pr-1">
              {OPPOSITION_TEAMS.filter(t => t.type === opponentTab).map((team) => {
                const isSelected = selectedOpponent.name === team.name;
                return (
                  <button
                    key={team.name}
                    onClick={() => setSelectedOpponent(team)}
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-44 transition-all duration-300 relative overflow-hidden cursor-pointer ${
                      isSelected 
                        ? 'bg-gradient-to-br from-[#3ECF8E]/15 to-[#131316] border-[#3ECF8E] shadow-lg shadow-[#3ECF8E]/10' 
                        : 'bg-[#0A0A0C]/50 border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02]'
                    }`}
                    id={`opponent-card-${team.name.toLowerCase().replace(' ', '-')}`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-mono text-[#3ECF8E] font-bold bg-[#3ECF8E]/10 px-2 py-0.5 rounded-md">
                          OVR {team.rating}
                        </span>
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                      </div>
                      <h4 className="text-base font-black tracking-tight text-slate-200 mt-3">{team.name}</h4>
                      <p className="text-[11px] font-mono text-slate-500 mt-1 leading-relaxed">
                        Tactics: {team.tactics.formation} • Line: {team.tactics.defensiveLine}/100
                      </p>
                    </div>

                    <div className="border-t border-white/[0.08] pt-2.5 mt-2">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">Key Threat</span>
                      <span className="text-[11px] font-medium text-slate-300 truncate block">
                        {team.keyPlayers.join(', ')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tactical pre-simulation overview */}
            <div className="bg-[#0A0A0C]/60 border border-white/[0.08] rounded-2xl p-4 space-y-4">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                Pre-Match Tactical Balance comparison
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Home Pressing</span>
                    <span className="text-[#3ECF8E] font-bold">{tactics.pressingIntensity}%</span>
                  </div>
                  <div className="w-full bg-[#0A0A0C] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#3ECF8E] h-full" style={{ width: `${tactics.pressingIntensity}%` }} />
                  </div>

                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Home Defensive Line</span>
                    <span className="text-[#3ECF8E] font-bold">{tactics.defensiveLine}%</span>
                  </div>
                  <div className="w-full bg-[#0A0A0C] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#3ECF8E] h-full" style={{ width: `${tactics.defensiveLine}%` }} />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Away Pressing ({selectedOpponent.name})</span>
                    <span className="text-blue-400 font-bold">{selectedOpponent.tactics.pressingIntensity}%</span>
                  </div>
                  <div className="w-full bg-[#0A0A0C] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: `${selectedOpponent.tactics.pressingIntensity}%` }} />
                  </div>

                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Away Defensive Line</span>
                    <span className="text-blue-400 font-bold">{selectedOpponent.tactics.defensiveLine}%</span>
                  </div>
                  <div className="w-full bg-[#0A0A0C] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: `${selectedOpponent.tactics.defensiveLine}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side launchpad */}
          <div className="lg:col-span-5 bg-gradient-to-b from-[#0A0A0C]/80 to-[#0A0A0C]/40 border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#3ECF8E]">
                <Star className="w-5 h-5" />
                <span className="text-sm font-bold tracking-tight">Match Arena Simulator</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your squad is locked in. Click below to stream the match minute-by-minute or simulate the full match results instantly.
              </p>

              <div className="bg-[#0A0A0C]/50 border border-white/[0.08] rounded-xl p-3 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Your Squad Strength:</span>
                  <span className="text-slate-300 font-bold">OVR {Math.round(players.reduce((acc, p) => acc + p.rating, 0) / Math.max(1, players.length))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Squad Chemistry:</span>
                  <span className="text-[#3ECF8E] font-bold">{chemistry}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Opposition Strength:</span>
                  <span className="text-slate-300 font-bold">OVR {selectedOpponent.rating}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 mt-6">
              <button
                onClick={startSimulation}
                className="w-full py-3 bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-[#0A0A0C] font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-[#3ECF8E]/20 flex items-center justify-center gap-2 cursor-pointer"
                id="start-live-sim-btn"
              >
                <Play className="w-4 h-4 fill-current" />
                Stream Live Match
              </button>

              <button
                onClick={handleInstantSimulate}
                className="w-full py-3 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.08] font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                id="instant-sim-btn"
              >
                <FastForward className="w-4 h-4" />
                Simulate Instantly
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Real-time Streaming Simulation Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Live Scoreboard & Commentary (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* Live digital Score banner */}
            <div className="bg-[#0A0A0C] border border-white/[0.08] rounded-2xl p-5 flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#3ECF8E]" />
              
              <div className="text-left">
                <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Home Squad</span>
                <span className="text-base font-black text-slate-100 tracking-tight">Your Team</span>
              </div>

              <div className="flex items-center gap-5">
                <span className="text-4xl font-black font-mono tracking-tighter text-slate-100">
                  {liveScore.home}
                </span>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-mono font-bold text-[#3ECF8E] bg-[#3ECF8E]/10 px-2.5 py-0.5 rounded-full animate-pulse">
                    {currentMinute === 90 ? 'FT' : `${currentMinute}'`}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 uppercase mt-1">Live</span>
                </div>
                <span className="text-4xl font-black font-mono tracking-tighter text-slate-100">
                  {liveScore.away}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">{selectedOpponent.name}</span>
                <span className="text-base font-black text-slate-100 tracking-tight">{selectedOpponent.name}</span>
              </div>
            </div>

            {/* Match Event commentary timeline */}
            <div className="bg-[#0A0A0C] border border-white/[0.08] rounded-2xl p-4 flex flex-col h-80">
              <div className="border-b border-white/[0.08] pb-2 mb-3 flex justify-between items-center">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                  Live Match Feed
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSimSpeed(166)} // 1X (15s total)
                    className={`py-0.5 px-1.5 text-[9px] font-mono font-bold rounded ${
                      simSpeed === 166 ? 'bg-[#3ECF8E]/20 text-[#3ECF8E]' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    1X
                  </button>
                  <button
                    onClick={() => setSimSpeed(83)} // 2X (7.5s total)
                    className={`py-0.5 px-1.5 text-[9px] font-mono font-bold rounded ${
                      simSpeed === 83 ? 'bg-[#3ECF8E]/20 text-[#3ECF8E]' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    2X
                  </button>
                  <button
                    onClick={() => setSimSpeed(33)} // 5X (3s total)
                    className={`py-0.5 px-1.5 text-[9px] font-mono font-bold rounded ${
                      simSpeed === 33 ? 'bg-[#3ECF8E]/20 text-[#3ECF8E]' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    5X
                  </button>
                </div>
              </div>

              {/* Feed items */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
                {simEvents.map((event, idx) => {
                  const isGoal = event.type === 'GOAL';
                  const isWarning = event.type === 'STAMINA_WARNING';
                  const isHalf = event.type === 'HALF_TIME';

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-xl border text-xs leading-relaxed ${
                        isGoal
                          ? 'bg-[#3ECF8E]/10 border-[#3ECF8E]/40 text-[#FAFAF8]'
                          : isWarning
                          ? 'bg-amber-950/45 border-amber-500/40 text-amber-200'
                          : isHalf
                          ? 'bg-blue-950/30 border-blue-800/20 text-blue-200'
                          : 'bg-white/[0.02] border-white/[0.05] text-slate-300'
                      }`}
                    >
                      {event.description}
                    </motion.div>
                  );
                })}
                <div ref={commentaryEndRef} />
              </div>
            </div>
          </div>

          {/* Player Live Stamina tracking (5 cols) */}
          <div className="lg:col-span-5 bg-[#0A0A0C] border border-white/[0.08] rounded-2xl p-4 flex flex-col space-y-4">
            <div>
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest block">
                Live Squad Stamina Depletion
              </span>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5 leading-relaxed">
                Stamina drains dynamically based on tactical Pressing Intensity. Under 45% penalizes player ratings.
              </p>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[340px] pr-1">
              {players.map((p) => {
                const stamina = runningStamina[p.id] !== undefined ? Math.round(runningStamina[p.id]) : 100;
                const isFatigued = stamina < 45;

                return (
                  <div key={p.id} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-medium truncate max-w-[140px]">{p.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-500 uppercase">{p.position}</span>
                        <span className={`font-mono text-xs font-bold ${isFatigued ? 'text-rose-400' : 'text-slate-400'}`}>
                          {stamina}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-[#131316] h-1 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isFatigued ? 'bg-rose-500 animate-pulse' : stamina < 70 ? 'bg-amber-500' : 'bg-[#3ECF8E]'
                        }`}
                        style={{ width: `${stamina}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
