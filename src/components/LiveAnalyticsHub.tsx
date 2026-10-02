import ValueChart from './ValueChart';
import { pricePlayer, PricingWeights } from '../data/players';
import React, { useState, useEffect } from 'react';
import { Player, PositionType, Tactics } from '../types';

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
  onAddPlayerToCatalog: (player: Player) => boolean;
  playersCatalog: Player[];
  weights: PricingWeights;
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
  weights,
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
        signal: AbortSignal.timeout(30000)
      });
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSearchResults(data.players || []);
      if (data.source === 'demo') triggerAlert('success', 'Showing demo records. Live scouting is unavailable or not configured.');
    } catch (err) {
      console.error(err);
      triggerAlert('error', 'Could not retrieve player records. Please try again.');
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
          signal: AbortSignal.timeout(30000),
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: searched.name,
          club: searched.club,
          nationality: searched.nationality,
          position: searched.position
        })
      });

      if (!response.ok) throw new Error('Enrichment failed');
      const player: Player & { source?: string } = await response.json();

      player.price = pricePlayer(player, weights).price;

      setAnalyzedPlayer(player);
      triggerAlert('success', player.source === 'demo' ? `Demo attributes generated for ${player.name}. These are not live statistics.` : `Estimated attributes generated for ${player.name}.`);
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
    if (!onAddPlayerToCatalog(analyzedPlayer)) return;
    setAnalyzedPlayer(null);
    setSearchQuery('');
    setSearchResults([]);
    triggerAlert('success', `${analyzedPlayer.name} has been imported into your Draft scouting pool!`);
  };

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
        <div className="bg-[#142238] border border-white/[0.08] rounded-2xl p-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#F48B56]/5 rounded-full blur-2xl" />
          
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 mb-4">
            <Database className="w-5 h-5 text-[#F48B56]" />
            <div>
              <h2 className="text-sm font-bold text-slate-200">Player Scouting Search</h2>
              <p className="text-xs font-sans text-slate-400 mt-0.5">Live lookup when configured; demo records otherwise. Attributes and form are estimates.</p>
            </div>
          </div>

          <form onSubmit={handleSearchLive} className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search real-world players (e.g., Yamal, Palmer, Messi, Bellingham)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0B1423] border border-white/[0.08] hover:border-white/[0.15] focus:border-[#F48B56]/80 focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 transition-colors placeholder:text-slate-400"
                id="live-api-search-input"
                aria-label="Search player scouting records"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="py-2.5 px-5 bg-[#F48B56] hover:bg-[#F48B56]/90 disabled:bg-white/[0.04] disabled:text-slate-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
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
                <div className="w-6 h-6 border-2 border-[#F48B56] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-sans text-slate-400">Querying RapidAPI Live Feed...</span>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((player) => (
                <div 
                  key={player.id} 
                  className="flex items-center justify-between p-3 bg-[#0B1423]/40 hover:bg-[#0B1423]/80 border border-white/[0.08] hover:border-white/[0.15] rounded-xl transition-all"
                >
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">{player.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-sans bg-[#0B1423] border border-white/[0.08] text-slate-400 px-1.5 py-0.2 rounded font-bold uppercase">{player.position}</span>
                      <span className="text-xs text-slate-400">{player.club} • {player.nationality}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEnrichPlayer(player)}
                    disabled={enrichingPlayerId !== null}
                    className="py-1 px-3 bg-white/[0.04] hover:bg-white/[0.08] hover:text-[#F48B56] border border-white/[0.08] rounded-lg text-xs font-sans font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1"
                  >
                    {enrichingPlayerId === player.id ? (
                      <>
                        <div className="w-2.5 h-2.5 border border-slate-300 border-t-transparent rounded-full animate-spin" />
                        Analyzing
                      </>
                    ) : (
                      <>
                        <Star className="w-3 h-3 text-[#F48B56]" />
                        Run AI Model
                      </>
                    )}
                  </button>
                </div>
              ))
            ) : searchQuery && !isSearching ? (
              <div className="p-6 text-center border border-white/[0.08] border-dashed rounded-xl">
                <span className="text-xs font-sans text-slate-400">Submit a search to look up matching player records.</span>
              </div>
            ) : (
              <div className="p-4 flex items-start gap-2.5 bg-[#0B1423]/30 border border-white/[0.08] rounded-xl text-xs text-slate-400">
                <Info className="w-4 h-4 text-[#F48B56] flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Search for a player, then select <strong className="text-slate-400">Run AI Model</strong> to estimate game attributes and playstyles. Without configured services, demo records and baseline attributes are used.
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
              className="bg-[#142238] border border-white/[0.08] rounded-2xl p-5 shadow-lg relative overflow-hidden"
              id="analytics-modeling-results"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#F48B56]/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#F48B56]" />
                  <span className="text-xs font-sans font-bold text-slate-400 uppercase tracking-wider">AI Predictive Valuation Sheet</span>
                </div>
                <div className="flex items-center gap-1 bg-[#F48B56]/10 border border-[#F48B56]/20 text-[#F48B56] px-2 py-0.5 rounded text-xs font-sans font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  PROJECTION VALID
                </div>
              </div>

              {/* Player Header Card */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-[#F2EADB]">{analyzedPlayer.name}</h3>
                  <p className="text-xs text-slate-400 font-sans mt-0.5">{analyzedPlayer.club} • {analyzedPlayer.nationality}</p>
                  
                  {/* Playstyles badges */}
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {analyzedPlayer.playstyles.map((style, idx) => (
                      <span key={idx} className="text-xs font-sans font-bold bg-[#0B1423] border border-white/[0.08] text-[#F48B56]/95 px-2 py-0.5 rounded-md">
                        ◈ {style}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block bg-[#0B1423] border border-white/[0.08] px-3.5 py-1 rounded-xl text-center">
                    <span className="block text-xs font-sans text-slate-400 uppercase tracking-widest leading-none">OVR</span>
                    <span className="text-2xl font-black text-[#F2EADB] tracking-tight">{analyzedPlayer.rating}</span>
                  </div>
                </div>
              </div>

              {/* Statistical Bars */}
              <div className="grid grid-cols-2 gap-4 mt-5">
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs font-sans text-slate-400">
                      <span>Pace</span>
                      <span className="font-bold text-[#F48B56]">{analyzedPlayer.stats.pace}</span>
                    </div>
                    <div className="w-full bg-[#0B1423] h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#F48B56] h-full rounded-full" style={{ width: `${analyzedPlayer.stats.pace}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-sans text-slate-400">
                      <span>Dribbling</span>
                      <span className="font-bold text-[#F48B56]">{analyzedPlayer.stats.dribbling}</span>
                    </div>
                    <div className="w-full bg-[#0B1423] h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#F48B56] h-full rounded-full" style={{ width: `${analyzedPlayer.stats.dribbling}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-sans text-slate-400">
                      <span>Passing Accuracy</span>
                      <span className="font-bold text-[#F48B56]">{analyzedPlayer.stats.passAccuracy}%</span>
                    </div>
                    <div className="w-full bg-[#0B1423] h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#F48B56] h-full rounded-full" style={{ width: `${analyzedPlayer.stats.passAccuracy}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-sans text-slate-400">
                      <span>Stamina Engine</span>
                      <span className="font-bold text-[#F48B56]">{analyzedPlayer.stats.stamina}</span>
                    </div>
                    <div className="w-full bg-[#0B1423] h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#F48B56] h-full rounded-full" style={{ width: `${analyzedPlayer.stats.stamina}%` }} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs font-sans text-slate-400">
                      <span>Defense/GK Ref</span>
                      <span className="font-bold text-[#F48B56]">{analyzedPlayer.stats.defense}</span>
                    </div>
                    <div className="w-full bg-[#0B1423] h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#F48B56] h-full rounded-full" style={{ width: `${analyzedPlayer.stats.defense}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-sans text-slate-400">
                      <span>Physicality</span>
                      <span className="font-bold text-[#F48B56]">{analyzedPlayer.stats.physicality}</span>
                    </div>
                    <div className="w-full bg-[#0B1423] h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#F48B56] h-full rounded-full" style={{ width: `${analyzedPlayer.stats.physicality}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-sans text-slate-400">
                      <span>Goals / Season (Est.)</span>
                      <span className="font-bold text-[#F48B56]">{analyzedPlayer.stats.goals}</span>
                    </div>
                    <div className="w-full bg-[#0B1423] h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#F48B56] h-full rounded-full" style={{ width: `${Math.min((analyzedPlayer.stats.goals / 40) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-sans text-slate-400">
                      <span>Expected Goals / 90 (xG)</span>
                      <span className="font-bold text-[#F48B56]">{analyzedPlayer.stats.xG90.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-[#0B1423] h-1.5 rounded-full overflow-hidden mt-1">
                      <div className="bg-[#F48B56] h-full rounded-full" style={{ width: `${Math.min(analyzedPlayer.stats.xG90 * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Form match-rating trends comparison */}
              <div className="bg-[#0B1423]/60 rounded-xl p-3 border border-white/[0.08] mt-4">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-xs font-sans text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#F48B56]" />
                    Estimated Form Ratings (5 Samples)
                  </span>
                  <span className="text-xs font-sans text-[#F48B56]">
                    Form Average: <strong className="font-bold">{(analyzedPlayer.recentForm.reduce((a,b)=>a+b, 0) / 5).toFixed(2)}</strong>
                  </span>
                </div>
                <div className="flex justify-between items-end h-10 px-4 mt-2">
                  {analyzedPlayer.recentForm.map((rating, idx) => {
                    const heightPercent = ((rating - 5) / 5) * 100;
                    return (
                      <div key={idx} className="flex flex-col items-center flex-1 group relative">
                        <div className="text-xs font-sans font-bold text-slate-700 dark:text-slate-300 mb-1 transition-transform absolute -top-5 bg-white dark:bg-[#142238] border border-black/[0.08] dark:border-white/[0.08] px-1 rounded shadow group-hover:scale-110">
                          {rating}
                        </div>
                        <div 
                          className={`w-4 rounded-t transition-all ${
                            rating >= 8.0 ? 'bg-gradient-to-t from-[#F48B56] to-orange-400' : rating >= 7.0 ? 'bg-[#F48B56]/60' : 'bg-slate-700/60'
                          }`} 
                          style={{ height: `${Math.max(15, Math.min(heightPercent, 100))}%` }} 
                        />
                        <span className="text-xs font-sans text-slate-400 mt-1">M{idx+1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Valuation calculations and Sign button */}
              <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-sans text-slate-400 uppercase tracking-widest leading-none">Scout Val Proj</div>
                  <div className="text-xl font-black text-[#F48B56] mt-1 flex items-center gap-1">
                    {analyzedPlayer.price} <span className="text-xs text-slate-400 uppercase font-sans font-bold">Credits</span>
                  </div>
                </div>

                <button
                  onClick={handleSignPlayer}
                  className="flex-1 py-3 bg-[#F48B56] hover:bg-[#F48B56]/90 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-[#F48B56]/10 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Sign to Scout pool
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="bg-[#142238]/30 border border-white/[0.08] border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center">
              <Star className="w-8 h-8 text-slate-700 mb-3 " />
              <p className="text-xs font-sans text-slate-400 leading-relaxed max-w-sm">
                No active player analysis loaded. Search and click <strong className="text-slate-400">Run AI Model</strong> above to perform deep statistical modeling on-the-fly.
              </p>
            </div>
          )}
        </AnimatePresence>

      </div>

      {/* RIGHT SECTION: Scatter Correlation & Tactical Analysis (5 cols) */}
      <div className="lg:col-span-5 flex flex-col space-y-4">
        
        <ValueChart players={playersCatalog} />

        {/* Tactical Simulator Math Analytics */}
        <div className="bg-[#142238] border border-white/[0.08] rounded-2xl p-4 shadow-xl flex flex-col gap-3">
          <div className="flex items-center gap-1.5 border-b border-white/[0.08] pb-2">
            <Zap className="w-4 h-4 text-[#F48B56]" />
            <span className="text-xs font-sans font-bold text-slate-400 uppercase tracking-wider">Tactical Stress Analysis</span>
          </div>

          <p className="text-xs text-slate-400 leading-normal font-normal">
            Evaluating active tactics slider coefficients to model dynamic physics simulations of stamina decay and xG potential.
          </p>

          <div className="grid grid-cols-2 gap-3.5 pt-1">
            <div className="bg-[#0B1423]/60 border border-white/[0.08] rounded-xl p-3">
              <span className="text-xs font-sans text-slate-400 uppercase block">Stamina Decay Multiplier</span>
              <div className="text-lg font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-rose-400" />
                {staminaDecayCoeff}x
              </div>
              <p className="text-xs text-slate-400 font-sans mt-1">Based on {tactics.pressingIntensity} Press / {tactics.tempo} Tempo</p>
            </div>

            <div className="bg-[#0B1423]/60 border border-white/[0.08] rounded-xl p-3">
              <span className="text-xs font-sans text-slate-400 uppercase block">Projected Pass Success</span>
              <div className="text-lg font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#F48B56]" />
                {calculatedPassingSuccess}%
              </div>
              <p className="text-xs text-slate-400 font-sans mt-1">Friction penalty from fast tempo</p>
            </div>

            <div className="bg-[#0B1423]/60 border border-white/[0.08] rounded-xl p-3">
              <span className="text-xs font-sans text-slate-400 uppercase block">Turnover Intensity</span>
              <div className="text-lg font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#F48B56] " />
                +{pressingEffect}%
              </div>
              <p className="text-xs text-slate-400 font-sans mt-1">Gegenpress turnover frequency boost</p>
            </div>

            <div className="bg-[#0B1423]/60 border border-white/[0.08] rounded-xl p-3">
              <span className="text-xs font-sans text-slate-400 uppercase block">xG Multiplier (Attack)</span>
              <div className="text-lg font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-[#F48B56]" />
                {expectedGoalsRatio}x
              </div>
              <p className="text-xs text-slate-400 font-sans mt-1">Offensive line overload potential</p>
            </div>
          </div>

          <div className="bg-[#0B1423]/40 border border-white/[0.08] p-3 rounded-xl flex gap-2 items-start mt-1">
            <Lightbulb className="w-4 h-4 text-[#F48B56] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-normal">
              {tactics.pressingIntensity > 65 
                ? "💡 High pressing intensity can increase early defensive turnovers but triggers severe stamina warnings after the 70th minute."
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
