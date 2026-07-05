import React, { useState, useEffect } from 'react';
import { Player, Tactics, MatchResult, MatchEvent, PlayerMatchRating } from '../types';

const APP_SECRET = 'football-app-secret-2024';
import { 
  BarChart2, 
  HelpCircle, 
  TrendingUp, 
  Star, 
  Activity, 
  User, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  AlertCircle,
  Award,
  Zap,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DebriefRoomProps {
  players: Player[];
  tactics: Tactics;
  chemistry: number;
  matchResult: MatchResult;
  onReset: () => void;
}

interface PlotShot {
  x: number;
  y: number;
  minute: number;
  player: string;
  xG: number;
  isGoal: boolean;
  team: 'HOME' | 'AWAY';
  description: string;
}

export default function DebriefRoom({
  players,
  tactics,
  chemistry,
  matchResult,
  onReset,
}: DebriefRoomProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'shots' | 'shap' | 'coach'>('overview');
  const [selectedRatingPlayer, setSelectedRatingPlayer] = useState<string | null>(null);
  
  // Coach summary API state
  const [coachSummary, setCoachSummary] = useState<string>('');
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [errorCoach, setErrorCoach] = useState('');

  // Local state for plotted shot events (to persist coordinates)
  const [plottedShots, setPlottedShots] = useState<PlotShot[]>([]);
  const [hoveredShot, setHoveredShot] = useState<PlotShot | null>(null);

  // Generate tactical pitch coordinates for all shot events
  useEffect(() => {
    const shots: PlotShot[] = [];
    matchResult.events.forEach((event) => {
      if (event.type === 'SHOT' || event.type === 'GOAL') {
        const isGoal = event.type === 'GOAL';
        const team = event.team as 'HOME' | 'AWAY';
        
        // Parse coordinates from description if present, otherwise fall back to randomized distribution
        let x = 0;
        let y = 0;
        const coordMatch = event.description.match(/from \((\d+\.?\d*),\s*(\d+\.?\d*)\)/);
        if (coordMatch) {
          x = parseFloat(coordMatch[1]);
          y = parseFloat(coordMatch[2]);
        } else {
          if (team === 'HOME') {
            // Home attacks left to right: shoot towards the right goal (x around 75 to 92%)
            x = 75 + Math.random() * 15;
            y = 20 + Math.random() * 60;
          } else {
            // Away attacks right to left: shoot towards the left goal (x around 8 to 25%)
            x = 8 + Math.random() * 15;
            y = 20 + Math.random() * 60;
          }
        }

        shots.push({
          x,
          y,
          minute: event.minute,
          player: event.player || (team === 'HOME' ? 'Home Player' : 'Opposition Winger'),
          xG: event.xG || 0.12,
          isGoal,
          team,
          description: event.description,
        });
      }
    });
    setPlottedShots(shots);
  }, [matchResult]);

  // Retrieve AI Coach Summary from backend on component mount
  useEffect(() => {
    const fetchCoachSummary = async () => {
      setLoadingCoach(true);
      setErrorCoach('');
      try {
        const res = await fetch('/api/coach-summary', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-app-secret': APP_SECRET
          },
          body: JSON.stringify({
            matchResult,
            tactics,
            chemistry,
          }),
        });
        
        if (!res.ok) {
          throw new Error('Failed to generate response from coach api server');
        }

        const data = await res.json();
        setCoachSummary(data.summary || 'Tactical analysis summary unavailable.');
      } catch (err: any) {
        console.error('Error fetching coach summary:', err);
        setErrorCoach('Could not contact tactical coaching server. Please check your connection.');
      } finally {
        setLoadingCoach(false);
      }
    };

    fetchCoachSummary();
  }, [matchResult, tactics, chemistry]);

  const stats = matchResult.stats;

  // Custom Momentum area graph SVG coordinates
  const renderMomentumSVG = () => {
    if (!matchResult.momentum || matchResult.momentum.length === 0) return null;
    const width = 600;
    const height = 150;
    const padding = 10;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;
    const centerY = height / 2;

    const points = matchResult.momentum.map((m, idx) => {
      const x = padding + (idx / (matchResult.momentum.length - 1)) * graphWidth;
      // m.value ranges from -100 to 100.
      // -100 (Away) should map to bottom (height - padding)
      // 100 (Home) should map to top (padding)
      const y = centerY - (m.value / 100) * (graphHeight / 2);
      return { x, y, value: m.value };
    });

    // Create SVG path string
    const linePath = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Fill path above CenterY (Home Momentum)
    const homeFillPath = [
      `M ${points[0].x} ${centerY}`,
      ...points.map((p) => `L ${p.x} ${p.y < centerY ? p.y : centerY}`),
      `L ${points[points.length - 1].x} ${centerY}`,
      'Z',
    ].join(' ');

    // Fill path below CenterY (Away Momentum)
    const awayFillPath = [
      `M ${points[0].x} ${centerY}`,
      ...points.map((p) => `L ${p.x} ${p.y > centerY ? p.y : centerY}`),
      `L ${points[points.length - 1].x} ${centerY}`,
      'Z',
    ].join(' ');

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full max-h-[220px]" id="momentum-svg-chart">
        <defs>
          <linearGradient id="homeMomentumGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3ECF8E" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3ECF8E" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="awayMomentumGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Center line (deadlock) */}
        <line x1={padding} y1={centerY} x2={width - padding} y2={centerY} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4" />

        {/* Gradient Fills */}
        <path d={homeFillPath} fill="url(#homeMomentumGrad)" />
        <path d={awayFillPath} fill="url(#awayMomentumGrad)" />

        {/* Core Line */}
        <path d={linePath} fill="none" stroke="#8A8A93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Indicators */}
        <text x={padding + 5} y={padding + 12} className="text-[10px] font-mono fill-[#3ECF8E] font-bold">▲ HOME DOMINANCE</text>
        <text x={padding + 5} y={height - padding - 4} className="text-[10px] font-mono fill-blue-400 font-bold">▼ AWAY PRESSURE</text>
      </svg>
    );
  };

  return (
    <div className="bg-[#131316] border border-white/[0.08] rounded-3xl p-6 shadow-2xl relative" id="debrief-room-container">
      {/* Upper Scoreboard Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/[0.08] pb-5 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#3ECF8E]" />
            <h2 className="text-xl font-black tracking-tight text-[#F2F2F0]">Tactical Debrief Room</h2>
          </div>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Analyze match outcomes • Inspect SHAP explainable models • Review Coach summary
          </p>
        </div>

        <button
          onClick={onReset}
          className="py-2.5 px-5 bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-[#0A0A0C] font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer"
          id="back-to-hq-btn"
        >
          Reset and Start New Draft
        </button>
      </div>

      {/* Global scoreboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 bg-[#0A0A0C]/80 border border-white/[0.08] rounded-2xl p-5 mb-6 items-center gap-4">
        <div className="text-center md:text-left">
          <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Squad Formation</span>
          <span className="text-sm font-black text-slate-300 font-mono">{tactics.formation}</span>
        </div>

        <div className="flex justify-center items-center gap-4">
          <div className="text-right">
            <span className="text-sm font-bold text-slate-200">Home</span>
          </div>
          <span className="text-4xl font-black font-mono text-[#3ECF8E]">{matchResult.homeScore}</span>
          <span className="text-xl font-bold text-slate-600">-</span>
          <span className="text-4xl font-black font-mono text-slate-100">{matchResult.awayScore}</span>
          <div className="text-left">
            <span className="text-sm font-bold text-slate-300">{matchResult.awayTeamName}</span>
          </div>
        </div>

        <div className="text-center md:text-right">
          <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Match Date</span>
          <span className="text-xs font-mono text-slate-400">{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex gap-1 bg-[#0A0A0C] p-1 rounded-xl border border-white/[0.08] mb-6 overflow-x-auto scrollbar-thin">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-[#3ECF8E] text-[#0A0A0C]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
          id="tab-overview"
        >
          <BarChart2 className="w-4 h-4" />
          Metrics Overview
        </button>

        <button
          onClick={() => setActiveTab('shots')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'shots'
              ? 'bg-[#3ECF8E] text-[#0A0A0C]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
          id="tab-shots"
        >
          <Target className="w-4 h-4" />
          2D Pitch Shot Map
        </button>

        <button
          onClick={() => setActiveTab('shap')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'shap'
              ? 'bg-[#3ECF8E] text-[#0A0A0C]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
          id="tab-shap"
        >
          <Zap className="w-4 h-4" />
          XAI SHAP Ratings
        </button>

        <button
          onClick={() => setActiveTab('coach')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'coach'
              ? 'bg-[#3ECF8E] text-[#0A0A0C]'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
          }`}
          id="tab-coach"
        >
          <Star className="w-4 h-4" />
          AI Coach Summary
        </button>
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Split Stats list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Core metrics comparison */}
              <div className="bg-[#0A0A0C] border border-white/[0.08] rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest border-b border-white/[0.08] pb-2">
                  Match Aggregates Comparison
                </h3>

                {/* Possession */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-mono">
                    <span className="text-[#3ECF8E] font-bold">{stats.possession}%</span>
                    <span className="text-slate-400">Possession</span>
                    <span className="text-slate-400">{100 - stats.possession}%</span>
                  </div>
                  <div className="w-full bg-[#131316] h-2 rounded-full overflow-hidden flex">
                    <div className="bg-[#3ECF8E] h-full" style={{ width: `${stats.possession}%` }} />
                    <div className="bg-blue-500 h-full" style={{ width: `${100 - stats.possession}%` }} />
                  </div>
                </div>

                {/* Shots */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-mono">
                    <span className="text-[#3ECF8E] font-bold">{stats.shots.home}</span>
                    <span className="text-slate-400">Total Shots</span>
                    <span className="text-slate-300 font-bold">{stats.shots.away}</span>
                  </div>
                  <div className="w-full bg-[#131316] h-2 rounded-full overflow-hidden flex">
                    <div className="bg-[#3ECF8E] h-full" style={{ width: `${(stats.shots.home / Math.max(1, stats.shots.home + stats.shots.away)) * 100}%` }} />
                    <div className="bg-blue-500 h-full" style={{ width: `${(stats.shots.away / Math.max(1, stats.shots.home + stats.shots.away)) * 100}%` }} />
                  </div>
                </div>

                {/* Shots on Target */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-mono">
                    <span className="text-[#3ECF8E] font-bold">{stats.shotsOnTarget.home}</span>
                    <span className="text-slate-400">Shots on Target</span>
                    <span className="text-slate-300 font-bold">{stats.shotsOnTarget.away}</span>
                  </div>
                  <div className="w-full bg-[#131316] h-2 rounded-full overflow-hidden flex">
                    <div className="bg-[#3ECF8E] h-full" style={{ width: `${(stats.shotsOnTarget.home / Math.max(1, stats.shotsOnTarget.home + stats.shotsOnTarget.away)) * 100}%` }} />
                    <div className="bg-blue-500 h-full" style={{ width: `${(stats.shotsOnTarget.away / Math.max(1, stats.shotsOnTarget.home + stats.shotsOnTarget.away)) * 100}%` }} />
                  </div>
                </div>

                {/* Expected Goals */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-mono">
                    <span className="text-[#3ECF8E] font-bold">{stats.xG.home.toFixed(2)}</span>
                    <span className="text-slate-400">Expected Goals (xG)</span>
                    <span className="text-slate-300 font-bold">{stats.xG.away.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-[#131316] h-2 rounded-full overflow-hidden flex">
                    <div className="bg-[#3ECF8E] h-full" style={{ width: `${(stats.xG.home / Math.max(0.1, stats.xG.home + stats.xG.away)) * 100}%` }} />
                    <div className="bg-blue-500 h-full" style={{ width: `${(stats.xG.away / Math.max(0.1, stats.xG.home + stats.xG.away)) * 100}%` }} />
                  </div>
                </div>

                {/* Passing Accuracy */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-mono">
                    <span className="text-[#3ECF8E] font-bold">{stats.passAccuracy.home}%</span>
                    <span className="text-slate-400">Pass Accuracy %</span>
                    <span className="text-slate-300 font-bold">{stats.passAccuracy.away}%</span>
                  </div>
                  <div className="w-full bg-[#131316] h-2 rounded-full overflow-hidden flex">
                    <div className="bg-[#3ECF8E] h-full" style={{ width: `${stats.passAccuracy.home}%` }} />
                    <div className="bg-blue-500 h-full" style={{ width: `${stats.passAccuracy.away}%` }} />
                  </div>
                </div>
              </div>

              {/* Momentum Over Time */}
              <div className="bg-[#0A0A0C] border border-white/[0.08] rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest border-b border-white/[0.08] pb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#3ECF8E]" />
                    90-Min Match Momentum
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono mt-1.5 leading-relaxed">
                    Visualizes minute-by-minute tactical domination based on quality differential, sliders, and luck.
                  </p>
                </div>

                <div className="flex-1 flex items-center justify-center mt-3">
                  {renderMomentumSVG()}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'shots' && (
          <motion.div
            key="shots"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            <div className="bg-[#0A0A0C] border border-white/[0.08] rounded-2xl p-4 flex flex-col lg:flex-row gap-6">
              {/* Visual 2D Pitch Shot Plotter */}
              <div className="flex-1 bg-[#131316]/50 border border-white/[0.08] rounded-xl overflow-hidden relative min-h-[255px] lg:min-h-[323px] lg:max-w-[480px]">
                {/* SVG Pitch Canvas */}
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full min-h-[255px]" id="shot-map-pitch">
                  {/* Pitch outline green lines */}
                  <rect x="0" y="0" width="100" height="100" fill="#0A0A0C" />
                  
                  {/* Boundary lines */}
                  <rect x="2" y="2" width="96" height="96" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                  
                  {/* Halfway line */}
                  <line x1="50" y1="2" x2="50" y2="98" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                  <circle cx="50" cy="50" r="10" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />

                  {/* Left penalty box */}
                  <rect x="2" y="25" width="15" height="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                  <rect x="2" y="37" width="5" height="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                  <line x1="17" y1="42" x2="17" y2="58" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />

                  {/* Right penalty box */}
                  <rect x="83" y="25" width="15" height="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                  <rect x="93" y="37" width="5" height="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                  <line x1="83" y1="42" x2="83" y2="58" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />

                  {/* Drawn Shot markers */}
                  {plottedShots.map((shot, idx) => (
                    <circle
                      key={idx}
                      cx={shot.x}
                      cy={shot.y}
                      r={Math.max(1.8, Math.min(3.5, shot.xG * 6))} // size proportional to xG
                      fill={shot.isGoal ? '#3ECF8E' : shot.team === 'HOME' ? '#fbbf24' : '#ef4444'}
                      className="cursor-pointer transition-all hover:scale-150 stroke-slate-950 stroke-1"
                      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                      onMouseEnter={() => setHoveredShot(shot)}
                      onMouseLeave={() => setHoveredShot(null)}
                    />
                  ))}
                </svg>

                {/* Key Indicators */}
                <div className="absolute top-3 left-3 bg-[#0A0A0C]/90 border border-white/[0.08] p-2.5 rounded-lg text-[10px] font-mono space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#3ECF8E]" />
                    <span className="text-slate-300">Goal Scored</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-slate-300">Home Team Shot</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span className="text-slate-300">Away Team Shot</span>
                  </div>
                </div>

                {/* Interactive Tooltip Overlay */}
                <AnimatePresence>
                  {hoveredShot && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute bottom-3 right-3 bg-[#0A0A0C] border border-white/[0.08] rounded-xl p-3 max-w-[280px] shadow-2xl text-xs space-y-1.5"
                    >
                      <div className="flex justify-between items-center font-mono">
                        <span className="font-bold text-[#3ECF8E]">{hoveredShot.minute}'</span>
                        <span className={`text-[10px] uppercase px-1.5 py-0.2 rounded font-bold ${
                          hoveredShot.isGoal ? 'bg-[#3ECF8E]/20 text-[#3ECF8E]' : 'bg-white/[0.05] text-slate-400'
                        }`}>
                          {hoveredShot.isGoal ? 'Goal' : 'Shot'}
                        </span>
                      </div>
                      <p className="font-bold text-slate-100 truncate">{hoveredShot.player}</p>
                      <p className="text-[11px] text-slate-400 leading-normal">{hoveredShot.description}</p>
                      <div className="text-[10px] font-mono text-slate-500 border-t border-white/[0.08] pt-1">
                        Expected Goals xG: <span className="text-slate-300 font-bold">{hoveredShot.xG.toFixed(2)}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Side Shot summary List */}
              <div className="w-full lg:w-[280px] space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest border-b border-white/[0.08] pb-1.5 mb-2.5">
                    Shot Map Analytics
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                    This interactive 2D diagram plots every shot location based on match momentum and slider configurations. Size indicates shooting xG weight. Hover on circles to review.
                  </p>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {plottedShots.map((shot, idx) => (
                    <div key={idx} className="bg-[#131316]/60 border border-white/[0.08] p-2.5 rounded-lg flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-mono text-slate-500">{shot.minute}'</span>
                        <span className="text-slate-300 truncate font-semibold">{shot.player}</span>
                      </div>
                      <span className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded flex-shrink-0 ${
                        shot.isGoal ? 'bg-[#3ECF8E]/20 text-[#3ECF8E]' : 'text-slate-500'
                      }`}>
                        xG {shot.xG.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'shap' && (
          <motion.div
            key="shap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-[#0A0A0C] border border-white/[0.08] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-[#3ECF8E] animate-pulse" />
                <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                  Explainable AI (XAI) SHAP Ratings
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal font-normal max-w-2xl mb-4">
                This dashboard uses game theory Shapley values to explain how each player's final performance rating was derived from baseline tactics, physical stamina levels, and match statistics.
              </p>

              {/* Player list layout with expandable SHAP charts */}
              <div className="space-y-3">
                {matchResult.playerRatings.home.map((rating) => {
                  const p = players.find((player) => player.id === rating.playerId);
                  if (!p) return null;
                  
                  const isOpen = selectedRatingPlayer === rating.playerId;
                  
                  return (
                    <div 
                      key={p.id}
                      className="bg-[#131316] border border-white/[0.08] hover:border-white/[0.15] rounded-xl overflow-hidden transition-colors"
                    >
                      <button
                        onClick={() => setSelectedRatingPlayer(isOpen ? null : rating.playerId)}
                        className="w-full p-3 flex justify-between items-center text-left cursor-pointer"
                        id={`shap-expand-${p.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`py-1 px-2 text-[10px] font-mono font-bold rounded ${
                            p.position === 'FWD' ? 'bg-rose-500/10 text-rose-400' :
                            p.position === 'MID' ? 'bg-amber-500/10 text-amber-400' :
                            p.position === 'DEF' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                          }`}>
                            {p.position}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-slate-200 block">{p.name}</span>
                            <span className="text-[10px] font-mono text-slate-500">{p.club}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right flex items-center gap-1.5 font-mono">
                            <span className="text-[10px] text-slate-500 uppercase">Match Rating:</span>
                            <span className="text-xs font-black text-[#3ECF8E] bg-[#3ECF8E]/15 border border-[#3ECF8E]/30 px-2 py-0.5 rounded">
                              {rating.rating}
                            </span>
                          </div>
                          {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-4 pb-4 border-t border-[#0A0A0C] bg-[#0A0A0C]/40"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3.5">
                              {/* Match Stats breakdown */}
                              <div className="bg-[#0A0A0C]/60 border border-white/[0.04] rounded-xl p-3 space-y-2">
                                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-1">
                                  Performance stats
                                </span>
                                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                                  <div className="flex justify-between border-b border-white/[0.04] pb-1">
                                    <span className="text-slate-500">Goals:</span>
                                    <span className="text-slate-300 font-bold">{rating.goals}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-white/[0.04] pb-1">
                                    <span className="text-slate-500">Assists:</span>
                                    <span className="text-slate-300 font-bold">{rating.assists}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-white/[0.04] pb-1">
                                    <span className="text-slate-500">Shots:</span>
                                    <span className="text-slate-300 font-bold">{rating.shots}</span>
                                  </div>
                                  <div className="flex justify-between border-b border-white/[0.04] pb-1">
                                    <span className="text-slate-500">Tackles:</span>
                                    <span className="text-slate-300 font-bold">{rating.tackles}</span>
                                  </div>
                                  <div className="flex justify-between col-span-2">
                                    <span className="text-slate-500">Passing Accuracy:</span>
                                    <span className="text-slate-300 font-bold">
                                      {rating.passesCompleted}/{rating.passesAttempted} ({rating.passesAttempted > 0 ? Math.round((rating.passesCompleted / rating.passesAttempted) * 100) : 0}%)
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* SHAP Game Theory Charts */}
                              <div className="bg-[#0A0A0C]/60 border border-white/[0.04] rounded-xl p-3 space-y-2">
                                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
                                  SHAP Value Contributions (Baseline 6.0)
                                </span>
                                
                                <div className="space-y-2 text-[10px] font-mono">
                                  {/* Attacking */}
                                  <div className="space-y-0.5">
                                    <div className="flex justify-between text-slate-400">
                                      <span>Attacking (xG/Goals/Assists)</span>
                                      <span className={rating.shapValues.attacking >= 0 ? 'text-[#3ECF8E]' : 'text-rose-400'}>
                                        {rating.shapValues.attacking >= 0 ? '+' : ''}{rating.shapValues.attacking.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="w-full bg-[#131316] h-1.5 rounded-full overflow-hidden flex">
                                      <div 
                                        className={rating.shapValues.attacking >= 0 ? 'bg-[#3ECF8E]' : 'bg-rose-500'}
                                        style={{ width: `${Math.min(100, Math.abs(rating.shapValues.attacking) * 40)}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Defending */}
                                  <div className="space-y-0.5">
                                    <div className="flex justify-between text-slate-400">
                                      <span>Defending Contributions</span>
                                      <span className={rating.shapValues.defending >= 0 ? 'text-[#3ECF8E]' : 'text-rose-400'}>
                                        {rating.shapValues.defending >= 0 ? '+' : ''}{rating.shapValues.defending.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="w-full bg-[#131316] h-1.5 rounded-full overflow-hidden flex">
                                      <div 
                                        className={rating.shapValues.defending >= 0 ? 'bg-[#3ECF8E]' : 'bg-rose-500'}
                                        style={{ width: `${Math.min(100, Math.abs(rating.shapValues.defending) * 40)}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Passing */}
                                  <div className="space-y-0.5">
                                    <div className="flex justify-between text-slate-400">
                                      <span>Passing & Connection</span>
                                      <span className={rating.shapValues.passing >= 0 ? 'text-[#3ECF8E]' : 'text-rose-400'}>
                                        {rating.shapValues.passing >= 0 ? '+' : ''}{rating.shapValues.passing.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="w-full bg-[#131316] h-1.5 rounded-full overflow-hidden flex">
                                      <div 
                                        className={rating.shapValues.passing >= 0 ? 'bg-[#3ECF8E]' : 'bg-rose-500'}
                                        style={{ width: `${Math.min(100, Math.abs(rating.shapValues.passing) * 40)}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Stamina */}
                                  <div className="space-y-0.5">
                                    <div className="flex justify-between text-slate-400">
                                      <span>Stamina Remaining</span>
                                      <span className={rating.shapValues.stamina >= 0 ? 'text-[#3ECF8E]' : 'text-rose-400'}>
                                        {rating.shapValues.stamina >= 0 ? '+' : ''}{rating.shapValues.stamina.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="w-full bg-[#131316] h-1.5 rounded-full overflow-hidden flex">
                                      <div 
                                        className={rating.shapValues.stamina >= 0 ? 'bg-[#3ECF8E]' : 'bg-rose-500'}
                                        style={{ width: `${Math.min(100, Math.abs(rating.shapValues.stamina) * 40)}%` }}
                                      />
                                    </div>
                                  </div>

                                  {/* Positional Role Fit */}
                                  {rating.shapValues.positional !== undefined && (
                                    <div className="space-y-0.5">
                                      <div className="flex justify-between text-slate-400">
                                        <span>Tactical Role Fit (Positional)</span>
                                        <span className={rating.shapValues.positional >= 0 ? 'text-[#3ECF8E]' : 'text-rose-400'}>
                                          {rating.shapValues.positional >= 0 ? '+' : ''}{rating.shapValues.positional.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="w-full bg-[#131316] h-1.5 rounded-full overflow-hidden flex">
                                        <div 
                                          className={rating.shapValues.positional >= 0 ? 'bg-[#3ECF8E]' : 'bg-rose-500'}
                                          style={{ width: `${Math.min(100, Math.abs(rating.shapValues.positional) * 40)}%` }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'coach' && (
          <motion.div
            key="coach"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-[#0A0A0C] border border-white/[0.08] rounded-2xl p-5 min-h-[300px] flex flex-col justify-between">
              {loadingCoach ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12">
                  <RefreshCw className="w-8 h-8 text-[#3ECF8E] animate-spin mb-4" />
                  <p className="text-xs font-mono text-slate-400 animate-pulse">
                    AI Coach is analyzing match timeline and tactical statistics...
                  </p>
                </div>
              ) : errorCoach ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-rose-500" />
                  <p className="text-sm font-mono text-slate-400">{errorCoach}</p>
                </div>
              ) : (
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
                    <Star className="w-5 h-5 text-[#3ECF8E]" />
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                      AI Coach Tactical Analysis summary
                    </span>
                  </div>

                  {/* Render the summary text beautifully with robust styles */}
                  <div className="text-xs text-slate-300 space-y-4 leading-relaxed font-sans overflow-y-auto max-h-[480px] pr-1">
                    {coachSummary.split('\n').map((line, idx) => {
                      if (line.startsWith('### ')) {
                        return <h3 key={idx} className="text-sm font-bold text-slate-100 font-sans tracking-tight pt-2">{line.replace('### ', '')}</h3>;
                      }
                      if (line.startsWith('#### ')) {
                        return <h4 key={idx} className="text-xs font-bold text-[#3ECF8E] font-mono tracking-wider pt-2">{line.replace('#### ', '')}</h4>;
                      }
                      if (line.startsWith('* ')) {
                        return <div key={idx} className="pl-4 py-0.5 text-slate-300 font-sans flex items-start gap-1.5">
                          <span className="text-[#3ECF8E]">•</span>
                          <span>{line.replace('* ', '')}</span>
                        </div>;
                      }
                      if (line.trim() === '') return <div key={idx} className="h-2" />;
                      return <p key={idx}>{line}</p>;
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
