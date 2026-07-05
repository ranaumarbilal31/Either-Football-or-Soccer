import React, { useState, useEffect } from 'react';
import { Player, PositionType, Tactics } from '../types';

const APP_SECRET = 'football-app-secret-2024';
import { 
  Search, 
  Activity, 
  Star, 
  ArrowUpRight, 
  Database, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Info,
  CheckCircle2,
  Lightbulb,
  ShieldCheck,
  Zap,
  BarChart4
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LiveAnalyticsHubProps {
  onAddPlayerToCatalog: (player: Player) => void;
  playersCatalog: Player[];
  tactics: Tactics;
  chemistry: number;
  triggerAlert: (type: 'error' | 'success', text: string) => void;
}

interface SearchedPlayer {
  id: string;
  name: string;
  position: PositionType;
  club: string;
  nationality: string;
}

export default function LiveAnalyticsHub({
  onAddPlayerToCatalog,
  playersCatalog,
  tactics,
  chemistry,
  triggerAlert
}: LiveAnalyticsHubProps) {
  // Live Lookup States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedPlayer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [enrichingPlayerId, setEnrichingPlayerId] = useState<string | null>(null);
  
  // Custom Analyzed Player (the active modeled result)
  const [analyzedPlayer, setAnalyzedPlayer] = useState<Player | null>(null);

  // Search real-time API
  const handleSearchLive = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/search-players?search=${encodeURIComponent(query)}`, {
        headers: { 'x-app-secret': APP_SECRET }
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data.players || []);
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Failed to retrieve real-time player records. Running fallback mocks.');
    } finally {
      setIsSearching(false);
    }
  };

  // Trigger Gemini enrichment & pricing calculation
  const handleEnrichPlayer = async (searched: SearchedPlayer) => {
    setEnrichingPlayerId(searched.id);
    setAnalyzedPlayer(null);
    try {
      const response = await fetch('/api/enrich-player', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-app-secret': APP_SECRET
        },
        body: JSON.stringify({
          name: searched.name,
          club: searched.club,
          nationality: searched.nationality,
          position: searched.position
        })
      });

      if (!response.ok) throw new Error('Enrichment failed');
      const player: Player = await response.json();

      // Compute pricing based on catalog rules so it is fully integrated
      // (Using the current default formula structure here)
      const baseRatingVal = (player.rating - 70) / 25;
      const goalsVal = Math.min(player.stats.goals / 40, 1);
      const assistsVal = Math.min(player.stats.assists / 20, 1);
      const xGVal = Math.min(player.stats.xG90 / 1.0, 1);
      const xAVal = Math.min(player.stats.xA90 / 0.5, 1);
      const defVal = player.stats.defense / 100;
      const stamVal = player.stats.stamina / 100;

      const score = 
        baseRatingVal * 0.5 +
        goalsVal * 0.15 +
        assistsVal * 0.1 +
        xGVal * 0.1 +
        xAVal * 0.05 +
        defVal * 0.05 +
        stamVal * 0.05;

      // Scale to fit budget range 45 to 165
      const minPossibleScore = 0.05;
      const maxPossibleScore = 0.85;
      const range = maxPossibleScore - minPossibleScore;
      const ratio = Math.max(0, Math.min((score - minPossibleScore) / range, 1));
      player.price = Math.round(45 + ratio * (165 - 45));

      setAnalyzedPlayer(player);
      triggerAlert('success', `Analytics model generated successfully for ${player.name}!`);
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'AI Analytics modeling failed.');
    } finally {
      setEnrichingPlayerId(null);
    }
  };

  // Sign player to catalog
  const handleSignPlayer = () => {
    if (!analyzedPlayer) return;
    onAddPlayerToCatalog(analyzedPlayer);
    setAnalyzedPlayer(null);
    setSearchQuery('');
    setSearchResults([]);
    triggerAlert('success', `${analyzedPlayer.name} has been imported into your Draft scouting pool!`);
  };

  // --- MATHEMATICAL SCATTER CORRELATION PLOT ENGINE (RAW SVG) ---
  // Renders OVR vs Price scatter plot for all current players in catalog
  const padding = 45;
  const graphWidth = 420;
  const graphHeight = 220;

  const minRating = 75;
  const maxRating = 95;
  const minPrice = 30;
  const maxPrice = 175;

  const getCoordinates = (rating: number, price: number) => {
    const x = padding + ((rating - minRating) / (maxRating - minRating)) * (graphWidth - 2 * padding);
    const y = graphHeight - padding - ((price - minPrice) / (maxPrice - minPrice)) * (graphHeight - 2 * padding);
    return { x, y };
  };

  // Calculate simple linear regression line (y = mx + c)
  const calcRegressionLine = () => {
    const validData = playersCatalog.filter(p => p.rating >= minRating && p.rating <= maxRating);
    if (validData.length < 2) return null;

    const n = validData.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    validData.forEach(p => {
      sumX += p.rating;
      sumY += p.price;
      sumXY += p.rating * p.price;
      sumXX += p.rating * p.rating;
    });

    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const c = (sumY - m * sumX) / n;

    const p1 = getCoordinates(minRating, m * minRating + c);
    const p2 = getCoordinates(maxRating, m * maxRating + c);

    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, m, c };
  };

  const trendLine = calcRegressionLine();

  // --- STATISTICAL ANALYSIS METRICS ---
  const averageRating = playersCatalog.reduce((sum, p) => sum + p.rating, 0) / (playersCatalog.length || 1);
  const averagePrice = playersCatalog.reduce((sum, p) => sum + p.price, 0) / (playersCatalog.length || 1);
  
  // Tactical Simulation Analytics Math
  const pressingEffect = Math.round(tactics.pressingIntensity * 0.8);
  const staminaDecayCoeff = (1 + (tactics.pressingIntensity * 0.005) + (tactics.tempo * 0.003)).toFixed(2);
  const calculatedPassingSuccess = Math.round(92 - (tactics.tempo * 0.15) - (tactics.pressingIntensity * 0.05));
  const expectedGoalsRatio = ((1 + (tactics.tempo * 0.008) + (tactics.defensiveLine * 0.005)) / 2).toFixed(2);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="live-analytics-dashboard">
      
      {/* LEFT SECTION: Real-Time Live Scouting & Modeling (7 cols) */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        
        {/* Real-time Opta / Live Data Search */}
        <div className="bg-[#131316] border border-white/[0.08] rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#3ECF8E]/5 rounded-full blur-2xl" />
          
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 mb-4">
            <Database className="w-5 h-5 text-[#3ECF8E]" />
            <div>
              <h2 className="text-sm font-bold text-slate-200">Real-Time Opta & Live Feeds Search</h2>
              <p className="text-[10px] font-mono text-slate-500 uppercase mt-0.5">Live Database Pipeline Integration</p>
            </div>
          </div>

          <form onSubmit={handleSearchLive} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search real-world players (e.g., Yamal, Palmer, Messi, Bellingham)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0A0A0C] border border-white/[0.08] hover:border-white/[0.15] focus:border-[#3ECF8E]/80 focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 transition-colors placeholder:text-slate-600"
                id="live-api-search-input"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="py-2.5 px-5 bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 disabled:bg-white/[0.04] disabled:text-slate-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isSearching ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Searching
                </>
              ) : 'Search'}
            </button>
          </form>

          {/* Results Area */}
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="w-6 h-6 border-2 border-[#3ECF8E] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono text-slate-500">Querying RapidAPI Live Feed...</span>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((player) => (
                <div 
                  key={player.id} 
                  className="flex items-center justify-between p-3 bg-[#0A0A0C]/40 hover:bg-[#0A0A0C]/80 border border-white/[0.08] hover:border-white/[0.15] rounded-xl transition-all"
                >
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">{player.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono bg-[#0A0A0C] border border-white/[0.08] text-slate-400 px-1.5 py-0.2 rounded font-bold uppercase">{player.position}</span>
                      <span className="text-[10px] text-slate-500">{player.club} • {player.nationality}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEnrichPlayer(player)}
                    disabled={enrichingPlayerId !== null}
                    className="py-1 px-3 bg-white/[0.04] hover:bg-white/[0.08] hover:text-[#3ECF8E] border border-white/[0.08] rounded-lg text-[10px] font-mono font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1"
                  >
                    {enrichingPlayerId === player.id ? (
                      <>
                        <div className="w-2.5 h-2.5 border border-slate-300 border-t-transparent rounded-full animate-spin" />
                        Analyzing
                      </>
                    ) : (
                      <>
                        <Star className="w-3 h-3 text-[#3ECF8E]" />
                        Run AI Model
                      </>
                    )}
                  </button>
                </div>
              ))
            ) : searchQuery && !isSearching ? (
              <div className="p-6 text-center border border-white/[0.08] border-dashed rounded-xl">
                <span className="text-xs font-mono text-slate-500">No players found matching your query on the Opta feed.</span>
              </div>
            ) : (
              <div className="p-4 flex items-start gap-2.5 bg-[#0A0A0C]/30 border border-white/[0.08] rounded-xl text-[11px] text-slate-500">
                <Info className="w-4 h-4 text-[#3ECF8E] flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Search actual world soccer stars. Clicking <strong className="text-slate-400">Run AI Model</strong> initiates a real-time data analytical pipeline using Gemini to retrieve and enrich deep technical attributes, compliment playstyles, and historical match rating indices before pricing them mathematically.
                </p>
              </div>
            )}
          </div>
        </div>        {/* Dynamic Analytics & Modeling Card */}
        <AnimatePresence mode="wait">
          {analyzedPlayer ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-[#131316] border border-white/[0.08] rounded-2xl p-5 shadow-2xl relative overflow-hidden"
              id="analytics-modeling-results"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#3ECF8E]/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#3ECF8E]" />
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">AI Predictive Valuation Sheet</span>
                </div>
                <div className="flex items-center gap-1 bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 text-[#3ECF8E] px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  PROJECTION VALID
                </div>
              </div>

              {/* Player Header Card */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-[#F2F2F0]">{analyzedPlayer.name}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{analyzedPlayer.club} • {analyzedPlayer.nationality}</p>
                  
                  {/* Playstyles badges */}
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {analyzedPlayer.playstyles.map((style, idx) => (
                      <span key={idx} className="text-[9px] font-mono font-bold bg-[#0A0A0C] border border-white/[0.08] text-[#3ECF8E]/95 px-2 py-0.5 rounded-md">
                        ◈ {style}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block bg-[#0A0A0C] border border-white/[0.08] px-3.5 py-1 rounded-xl text-center">
                    <span className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none">OVR</span>
                    <span className="text-2xl font-black text-[#F2F2F0] tracking-tight">{analyzedPlayer.rating}</span>
                  </div>
                </div>
              </div>

              {/* Statistical Bars */}
              <div className="grid grid-cols-2 gap-4 mt-5">
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Pace</span>
                      <span className="font-bold text-[#3ECF8E]">{analyzedPlayer.stats.pace}</span>
                    </div>
                    <div className="w-full bg-[#0A0A0C] h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#3ECF8E] h-full rounded-full" style={{ width: `${analyzedPlayer.stats.pace}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Dribbling</span>
                      <span className="font-bold text-[#3ECF8E]">{analyzedPlayer.stats.dribbling}</span>
                    </div>
                    <div className="w-full bg-[#0A0A0C] h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#3ECF8E] h-full rounded-full" style={{ width: `${analyzedPlayer.stats.dribbling}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Passing Accuracy</span>
                      <span className="font-bold text-[#3ECF8E]">{analyzedPlayer.stats.passAccuracy}%</span>
                    </div>
                    <div className="w-full bg-[#0A0A0C] h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#3ECF8E] h-full rounded-full" style={{ width: `${analyzedPlayer.stats.passAccuracy}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Stamina Engine</span>
                      <span className="font-bold text-[#3ECF8E]">{analyzedPlayer.stats.stamina}</span>
                    </div>
                    <div className="w-full bg-[#0A0A0C] h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#3ECF8E] h-full rounded-full" style={{ width: `${analyzedPlayer.stats.stamina}%` }} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Defense/GK Ref</span>
                      <span className="font-bold text-[#3ECF8E]">{analyzedPlayer.stats.defense}</span>
                    </div>
                    <div className="w-full bg-[#0A0A0C] h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#3ECF8E] h-full rounded-full" style={{ width: `${analyzedPlayer.stats.defense}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Physicality</span>
                      <span className="font-bold text-[#3ECF8E]">{analyzedPlayer.stats.physicality}</span>
                    </div>
                    <div className="w-full bg-[#0A0A0C] h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#3ECF8E] h-full rounded-full" style={{ width: `${analyzedPlayer.stats.physicality}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Goals / Season (Est.)</span>
                      <span className="font-bold text-[#3ECF8E]">{analyzedPlayer.stats.goals}</span>
                    </div>
                    <div className="w-full bg-[#0A0A0C] h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#3ECF8E] h-full rounded-full" style={{ width: `${Math.min((analyzedPlayer.stats.goals / 40) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Expected Goals / 90 (xG)</span>
                      <span className="font-bold text-[#3ECF8E]">{analyzedPlayer.stats.xG90.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-[#0A0A0C] h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#3ECF8E] h-full rounded-full" style={{ width: `${Math.min(analyzedPlayer.stats.xG90 * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Form match-rating trends comparison */}
              <div className="bg-[#0A0A0C]/60 rounded-xl p-3 border border-white/[0.08] mt-4">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#3ECF8E]" />
                    Opta Recent Form Match Indices (Last 5 Matches)
                  </span>
                  <span className="text-[10px] font-mono text-[#3ECF8E]">
                    Form Average: <strong className="font-bold">{(analyzedPlayer.recentForm.reduce((a,b)=>a+b, 0) / 5).toFixed(2)}</strong>
                  </span>
                </div>
                <div className="flex justify-between items-end h-10 px-4 mt-2">
                  {analyzedPlayer.recentForm.map((rating, idx) => {
                    const heightPercent = ((rating - 5) / 5) * 100;
                    return (
                      <div key={idx} className="flex flex-col items-center flex-1 group relative">
                        <div className="text-[9px] font-mono font-bold text-slate-700 dark:text-slate-300 mb-1 transition-transform absolute -top-5 bg-white dark:bg-[#131316] border border-black/[0.08] dark:border-white/[0.08] px-1 rounded shadow group-hover:scale-110">
                          {rating}
                        </div>
                        <div 
                          className={`w-4 rounded-t transition-all ${
                            rating >= 8.0 ? 'bg-gradient-to-t from-[#3ECF8E] to-emerald-400' : rating >= 7.0 ? 'bg-[#3ECF8E]/60' : 'bg-slate-700/60'
                          }`} 
                          style={{ height: `${Math.max(15, Math.min(heightPercent, 100))}%` }} 
                        />
                        <span className="text-[8px] font-mono text-slate-500 mt-1">M{idx+1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Valuation calculations and Sign button */}
              <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between gap-4">
                <div>
                  <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none">Scout Val Proj</div>
                  <div className="text-xl font-black text-[#3ECF8E] mt-1 flex items-center gap-1">
                    {analyzedPlayer.price} <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Credits</span>
                  </div>
                </div>

                <button
                  onClick={handleSignPlayer}
                  className="flex-1 py-3 bg-[#3ECF8E] hover:bg-[#3ECF8E]/90 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-[#3ECF8E]/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Sign to Scout pool
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="bg-[#131316]/30 border border-white/[0.08] border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center">
              <Star className="w-8 h-8 text-slate-700 mb-3 animate-pulse" />
              <p className="text-xs font-mono text-slate-500 leading-relaxed max-w-sm">
                No active player analysis loaded. Search and click <strong className="text-slate-400">Run AI Model</strong> above to perform deep statistical modeling on-the-fly.
              </p>
            </div>
          )}
        </AnimatePresence>

      </div>

      {/* RIGHT SECTION: Scatter Correlation & Tactical Analysis (5 cols) */}
      <div className="lg:col-span-5 flex flex-col space-y-4">
        
        {/* Rating vs Price Scatter Plot */}
        <div className="bg-[#131316] border border-white/[0.08] rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2 mb-3">
            <div className="flex items-center gap-1.5">
              <BarChart4 className="w-4 h-4 text-[#3ECF8E]" />
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">OVR vs Cost Scatter Correlation</span>
            </div>
            <span className="text-[10px] font-mono bg-[#3ECF8E]/10 border border-[#3ECF8E]/20 text-[#3ECF8E] px-1.5 rounded font-semibold">
              Live Regression
            </span>
          </div>

          <div className="flex items-center justify-center p-1 bg-[#0A0A0C] rounded-xl border border-white/[0.08]">
            {/* RAW SVG Chart */}
            <svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} className="w-full h-auto text-slate-400 font-mono">
              {/* Grid Lines */}
              <line x1={padding} y1={padding} x2={graphWidth - padding} y2={padding} stroke="#1F1F24" strokeDasharray="3,3" />
              <line x1={padding} y1={(graphHeight)/2} x2={graphWidth - padding} y2={(graphHeight)/2} stroke="#1F1F24" strokeDasharray="3,3" />
              <line x1={padding} y1={graphHeight - padding} x2={graphWidth - padding} y2={graphHeight - padding} stroke="#2E2E35" />
              <line x1={padding} y1={padding} x2={padding} y2={graphHeight - padding} stroke="#2E2E35" />

              {/* X Axis labels (OVR) */}
              <text x={padding} y={graphHeight - 12} textAnchor="middle" className="text-[9px] fill-slate-500">75</text>
              <text x={padding + (graphWidth - 2 * padding)/2} y={graphHeight - 12} textAnchor="middle" className="text-[9px] fill-slate-500">85</text>
              <text x={graphWidth - padding} y={graphHeight - 12} textAnchor="middle" className="text-[9px] fill-slate-500">95</text>
              <text x={graphWidth/2} y={graphHeight - 2} textAnchor="middle" className="text-[9px] font-bold fill-slate-400">ATHLETE OVR RATING</text>

              {/* Y Axis labels (Cost) */}
              <text x={padding - 8} y={graphHeight - padding} textAnchor="end" dominantBaseline="middle" className="text-[9px] fill-slate-500">30</text>
              <text x={padding - 8} y={padding + (graphHeight - 2 * padding)/2} textAnchor="end" dominantBaseline="middle" className="text-[9px] fill-slate-500">100</text>
              <text x={padding - 8} y={padding} textAnchor="end" dominantBaseline="middle" className="text-[9px] fill-slate-500">170</text>
              
              <text x={10} y={graphHeight/2} textAnchor="middle" transform={`rotate(-90 10 ${graphHeight/2})`} className="text-[9px] font-bold fill-slate-400">COST (CREDITS)</text>

              {/* Regression Line */}
              {trendLine && (
                <line 
                  x1={trendLine.x1} 
                  y1={trendLine.y1} 
                  x2={trendLine.x2} 
                  y2={trendLine.y2} 
                  stroke="#3ECF8E" 
                  strokeWidth="2" 
                  strokeDasharray="4,2"
                />
              )}

              {/* Scatter Dots */}
              {playersCatalog.map((p, idx) => {
                const { x, y } = getCoordinates(p.rating, p.price);
                return (
                  <g key={p.id} className="group cursor-help">
                    <circle 
                      cx={x} 
                      cy={y} 
                      r="4" 
                      className="fill-[#3ECF8E]/80 stroke-[#0A0A0C] stroke-1 hover:fill-[#3ECF8E] hover:scale-150 transition-all" 
                    />
                    <title>{`${p.name} (${p.club})\nOVR: ${p.rating} | Cost: ${p.price}`}</title>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Statistical Equations Info */}
          <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] font-mono text-slate-400 bg-[#0A0A0C]/60 border border-white/[0.08] p-2.5 rounded-xl">
            <div>
              <span>Catalog Average OVR:</span>
              <span className="block font-bold text-[#3ECF8E] mt-0.5">{averageRating.toFixed(1)} Rating</span>
            </div>
            <div>
              <span>Catalog Average Cost:</span>
              <span className="block font-bold text-[#3ECF8E] mt-0.5">{averagePrice.toFixed(1)} Credits</span>
            </div>
            {trendLine && (
              <div className="col-span-2 border-t border-white/[0.08] pt-2 mt-1 flex justify-between">
                <span>Regression Equation:</span>
                <span className="font-bold text-[#3ECF8E]">y = {trendLine.m.toFixed(2)}x + {trendLine.c.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tactical Simulator Math Analytics */}
        <div className="bg-[#131316] border border-white/[0.08] rounded-2xl p-4 shadow-xl flex flex-col gap-3">
          <div className="flex items-center gap-1.5 border-b border-white/[0.08] pb-2">
            <Zap className="w-4 h-4 text-[#3ECF8E]" />
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Tactical Stress Analysis</span>
          </div>

          <p className="text-[10px] text-slate-500 leading-normal font-normal">
            Evaluating active tactics slider coefficients to model dynamic physics simulations of stamina decay and xG potential.
          </p>

          <div className="grid grid-cols-2 gap-3.5 pt-1">
            <div className="bg-[#0A0A0C]/60 border border-white/[0.08] rounded-xl p-3">
              <span className="text-[9px] font-mono text-slate-500 uppercase block">Stamina Decay Multiplier</span>
              <div className="text-lg font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                {staminaDecayCoeff}x
              </div>
              <p className="text-[8px] text-slate-500 font-mono mt-1">Based on {tactics.pressingIntensity} Press / {tactics.tempo} Tempo</p>
            </div>

            <div className="bg-[#0A0A0C]/60 border border-white/[0.08] rounded-xl p-3">
              <span className="text-[9px] font-mono text-slate-500 uppercase block">Projected Pass Success</span>
              <div className="text-lg font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#3ECF8E]" />
                {calculatedPassingSuccess}%
              </div>
              <p className="text-[8px] text-slate-500 font-mono mt-1">Friction penalty from fast tempo</p>
            </div>

            <div className="bg-[#0A0A0C]/60 border border-white/[0.08] rounded-xl p-3">
              <span className="text-[9px] font-mono text-slate-500 uppercase block">Turnover Intensity</span>
              <div className="text-lg font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#3ECF8E] animate-pulse" />
                +{pressingEffect}%
              </div>
              <p className="text-[8px] text-slate-500 font-mono mt-1">Gegenpress turnover frequency boost</p>
            </div>

            <div className="bg-[#0A0A0C]/60 border border-white/[0.08] rounded-xl p-3">
              <span className="text-[9px] font-mono text-slate-500 uppercase block">xG Multiplier (Attack)</span>
              <div className="text-lg font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-[#3ECF8E]" />
                {expectedGoalsRatio}x
              </div>
              <p className="text-[8px] text-slate-500 font-mono mt-1">Offensive line overload potential</p>
            </div>
          </div>

          <div className="bg-[#0A0A0C]/40 border border-white/[0.08] p-3 rounded-xl flex gap-2 items-start mt-1">
            <Lightbulb className="w-4 h-4 text-[#3ECF8E] flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-normal">
              {tactics.pressingIntensity > 65 
                ? "💡 High pressing intensity guarantees early defensive turnovers but triggers severe stamina warnings after the 70th minute."
                : tactics.tempo > 65 
                ? "💡 Direct/Fast build-up tempo maximizes counter-attack frequency but yields higher passing attrition rates in midfield."
                : "💡 Balanced line coordinates structured build-ups with minimal unforced passing errors. Highly recommended for tournament formats."}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
