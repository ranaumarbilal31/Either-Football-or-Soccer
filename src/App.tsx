import { readStored, writeStored } from './utils/storage';
import { isPlayer, isSquad, isTactics, isRecord, inRange } from './utils/validation';
import { calculateSquadChemistry } from './utils/chemistry';
import { resolveAssignments, autofillSquad } from './utils/squad';
import React, { useState, useEffect } from 'react';
import { 
  getPlayersWithDynamicPrices, pricePlayer,
  DEFAULT_PRICING_WEIGHTS, 
  PricingWeights 
} from './data/players';
import { Player, PositionType, FormationType, Tactics, MatchResult } from './types';
import PlayerCard from './components/PlayerCard';
import SquadPitch from './components/SquadPitch';
import ScoutReport from './components/ScoutReport';
import { getFormationLayout } from './utils/formations';
import MatchSimulator from './components/MatchSimulator';
import DebriefRoom from './components/DebriefRoom';
import LiveAnalyticsHub from './components/LiveAnalyticsHub';
import { 
  Search, 
  Coins, 
  Settings, 
  RefreshCw, 
  Star, 
  AlertCircle, 
  CheckCircle2,
  Trash2,
  Award,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';

const FORMATIONS: FormationType[] = ['4-3-3', '3-5-2', '4-2-3-1', '4-4-2', '5-3-2'];

export default function App() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const [weights, setWeights] = useState<PricingWeights>(() => {
    return readStored('pricing_weights', DEFAULT_PRICING_WEIGHTS, v => isRecord(v) && Object.keys(DEFAULT_PRICING_WEIGHTS).every(k => inRange(v[k], 0, 1)));
  });
  const [showWeightsConfig, setShowWeightsConfig] = useState(false);

  const [customPlayers, setCustomPlayers] = useState<Player[]>(() => {
    return readStored<Player[]>('custom_scouted_players', [], v => Array.isArray(v) && v.every(isPlayer));
  });

  useEffect(() => {
    writeStored('custom_scouted_players', customPlayers);
  }, [customPlayers]);

  const players = React.useMemo(() => [
    ...getPlayersWithDynamicPrices(weights), ...customPlayers.map(player => pricePlayer(player, weights))
  ], [weights, customPlayers]);

  const handleImportLivePlayer = (newPlayer: Player) => {
    if (players.some(p => p.id === newPlayer.id || p.name.toLowerCase() === newPlayer.name.toLowerCase())) {
      triggerAlert('error', `${newPlayer.name} is already in your scouting catalog!`);
      return false;
    }
    setCustomPlayers(prev => [newPlayer, ...prev]);
    return true;
  };

  const [activeDraftTab, setActiveDraftTab] = useState<'roster' | 'live-analytics'>('roster');

  const [draftedPlayers, setDraftedPlayers] = useState<Player[]>(() => readStored('drafted_players', [], isSquad));

  const [tactics, setTactics] = useState<Tactics>(() => {
    return readStored<Tactics>('squad_tactics', {
      formation: '4-3-3',
      defensiveLine: 50,
      tempo: 50,
      pressingIntensity: 50
    }, isTactics);
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<PositionType | 'ALL'>('ALL');
  const [nationalityFilter, setNationalityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'rating' | 'price_asc' | 'price_desc'>('rating');
  const [scoutingPlayer, setScoutingPlayer] = useState<Player | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const [slotAssignments, setSlotAssignments] = useState<Record<string, string>>(() => {
    return readStored('slot_assignments', {}, v => isRecord(v) && Object.values(v).every(id => typeof id === 'string'));
  });

  useEffect(() => {
    writeStored('slot_assignments', slotAssignments);
  }, [slotAssignments]);

  useEffect(() => {
    setSlotAssignments(prev => resolveAssignments(draftedPlayers, tactics.formation, prev));
  }, [draftedPlayers, tactics.formation]);

  const nationalities = React.useMemo(() => {
    const nats = players.map(p => p.nationality);
    const unique = Array.from(new Set(nats)).filter(Boolean).sort();
    return ['ALL', ...unique];
  }, [players]);

  const [currentView, setCurrentView] = useState<'draft' | 'simulation' | 'debrief'>('draft');
  const [simulationResult, setSimulationResult] = useState<MatchResult | null>(null);

  const calculateChemistry = () => calculateSquadChemistry(draftedPlayers, tactics.formation, slotAssignments);

  useEffect(() => {
    writeStored('drafted_players', draftedPlayers);
  }, [draftedPlayers]);

  useEffect(() => {
    writeStored('squad_tactics', tactics);
  }, [tactics]);

  useEffect(() => {
    writeStored('pricing_weights', weights);
  }, [weights]);

  const triggerAlert = (type: 'error' | 'success', text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => {
      setAlertMessage(null);
    }, 4000);
  };

  const handlePositionChange = (player: Player, newPosition: string) => {
    const layout = getFormationLayout(tactics.formation);
    const source = layout.find(slot => slotAssignments[slot.id] === player.id);
    const target = layout.find(slot => slot.positionType === newPosition && slot.id !== source?.id);
    if (!source || !target || (player.position === 'GK') !== (newPosition === 'GK')) {
      triggerAlert('error', 'No compatible slot available. Goalkeepers must remain in goal.');
      return;
    }
    setSlotAssignments(prev => {
      const next = { ...prev, [target.id]: player.id };
      if (prev[target.id]) next[source.id] = prev[target.id];
      else delete next[source.id];
      return next;
    });
  };

  const [budgetLimit, setBudgetLimit] = useState<number>(() => {
    return readStored('budget_limit', 1000, v => inRange(v, 500, 5000));
  });

  useEffect(() => {
    writeStored('budget_limit', budgetLimit);
  }, [budgetLimit]);

  const totalCost = draftedPlayers.reduce((acc, p) => acc + p.price, 0);
  const remainingBudget = budgetLimit - totalCost;

  const getFormationRequiredCounts = (): Record<PositionType, number> => {
    switch (tactics.formation) {
      case '4-3-3':
        return { GK: 1, DEF: 4, MID: 3, FWD: 3 };
      case '3-5-2':
        return { GK: 1, DEF: 3, MID: 5, FWD: 2 };
      case '4-2-3-1':
        return { GK: 1, DEF: 4, MID: 5, FWD: 1 };
      case '4-4-2':
        return { GK: 1, DEF: 4, MID: 4, FWD: 2 };
      case '5-3-2':
        return { GK: 1, DEF: 5, MID: 3, FWD: 2 };
    }
  };

  const handleDraftPlayer = (player: Player) => {
    if (draftedPlayers.length >= 11) {
      triggerAlert('error', 'Squad is already full. Release a player first.');
      return;
    }
    if (totalCost + player.price > budgetLimit) {
      triggerAlert('error', `Insufficient budget. ${player.name} costs ${player.price} cr, but only ${remainingBudget} cr is remaining.`);
      return;
    }

    if (draftedPlayers.some(p => p.id === player.id)) {
      triggerAlert('error', `${player.name} is already drafted.`);
      return;
    }

    const requirements = getFormationRequiredCounts();
    const currentCount = draftedPlayers.filter(p => p.position === player.position).length;

    if (currentCount >= requirements[player.position]) {
      triggerAlert('error', `Formation ${tactics.formation} permits a maximum of ${requirements[player.position]} ${player.position}s. Release an existing one first.`);
      return;
    }

    setDraftedPlayers([...draftedPlayers, player]);
    triggerAlert('success', `${player.name} has been drafted to your squad.`);
  };

  const handleReleasePlayer = (player: Player) => {
    setDraftedPlayers(draftedPlayers.filter(p => p.id !== player.id));
    triggerAlert('success', `${player.name} released from squad.`);
  };

  const handleClearSquad = () => {
    setDraftedPlayers([]);
    setSlotAssignments({});
    triggerAlert('success', 'Squad roster cleared.');
  };

  const handleAutofillSquad = () => {
    const next = autofillSquad(draftedPlayers, players, tactics.formation, budgetLimit);
    setDraftedPlayers(next);
    triggerAlert(next.length === 11 ? 'success' : 'error', next.length === 11 ? 'Squad filled within your budget.' : 'Budget or available players cannot fill every slot. Increase the budget or release a player.');
  };

  const handleLoadPresetSquad = (name: string, isClub: boolean) => {
    let presetFormation: FormationType = '4-3-3';
    if (name === 'France' || name === 'Bayern Munich' || name === 'Germany' || name === 'England') {
      presetFormation = '4-2-3-1';
    } else if (name === 'Inter Milan' || name === 'Bayer Leverkusen') {
      presetFormation = '3-5-2';
    }



    const teamPlayers = players.filter(p => isClub ? p.club === name : p.nationality === name);

    const reqs = {
      '4-3-3': { GK: 1, DEF: 4, MID: 3, FWD: 3 },
      '4-2-3-1': { GK: 1, DEF: 4, MID: 5, FWD: 1 },
      '3-5-2': { GK: 1, DEF: 3, MID: 5, FWD: 2 },
      '4-4-2': { GK: 1, DEF: 4, MID: 4, FWD: 2 },
      '5-3-2': { GK: 1, DEF: 5, MID: 3, FWD: 2 },
    }[presetFormation];

    const selected: Player[] = [];
    const positions: PositionType[] = ['GK', 'DEF', 'MID', 'FWD'];

    positions.forEach(pos => {
      const needed = reqs[pos];
      const availableOfPos = teamPlayers
        .filter(p => p.position === pos)
        .sort((a, b) => b.rating - a.rating);
      
      for (let i = 0; i < Math.min(needed, availableOfPos.length); i++) {
        selected.push(availableOfPos[i]);
      }

      const currentCount = selected.filter(p => p.position === pos).length;
      if (currentCount < needed) {
        const fillers = players
          .filter(p => p.position === pos && !selected.some(s => s.id === p.id))
          .sort((a, b) => b.rating - a.rating);
        for (let i = 0; i < (needed - currentCount); i++) {
          if (fillers[i]) selected.push(fillers[i]);
        }
      }
    });

    const cost = selected.reduce((sum, player) => sum + player.price, 0);
    if (cost > budgetLimit) {
      triggerAlert('error', `This preset costs ${cost} cr. Increase your budget to load it.`);
      return;
    }
    setTactics(prev => ({ ...prev, formation: presetFormation }));
    setSlotAssignments({});
    setDraftedPlayers(selected);
    triggerAlert('success', `Drafted full ${name} preset squad in a ${presetFormation} formation!`);
  };

  const handleResetWeights = () => {
    setWeights(DEFAULT_PRICING_WEIGHTS);
    triggerAlert('success', 'Pricing weights restored to default.');
  };

  const filteredPlayers = players
    .filter((player) => {
      const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            player.club.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            player.nationality.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPosition = positionFilter === 'ALL' || player.position === positionFilter;
      const matchesNationality = nationalityFilter === 'ALL' || player.nationality === nationalityFilter;
      return matchesSearch && matchesPosition && matchesNationality;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'price_asc') return a.price - b.price;
      return b.price - a.price;
    });

  const draftedCounts = {
    GK: draftedPlayers.filter(p => p.position === 'GK').length,
    DEF: draftedPlayers.filter(p => p.position === 'DEF').length,
    MID: draftedPlayers.filter(p => p.position === 'MID').length,
    FWD: draftedPlayers.filter(p => p.position === 'FWD').length,
  };

  const reqCounts = getFormationRequiredCounts();

  return (
    <div className="min-h-screen bg-[#0B1423] text-[#F2EADB] flex flex-col font-sans selection:bg-[#F48B56] selection:text-[#0B1423] relative overflow-hidden">
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />
      
      <header className="club-header">
        <div className="club-header-inner">
          <a className="club-brand" href="/" aria-label="Either Football or Soccer home">
            <span className="club-crest"><img src="/logo.webp" width="64" height="64" alt="Either Football or Soccer crest" /></span>
            <div><h1>Either Football <span>or Soccer</span></h1><p>YOUR CLUB. YOUR CALL.</p></div>
          </a>
          <div className="header-season"><span className="season-mark">XI</span><div>THE FOOTBALL LAB<small>Draft / Tactics / Matchday</small></div></div>
        </div>
      </header>
      {currentView === 'draft' && <section className="club-hero">
        <div className="hero-copy"><span className="section-kicker">WELCOME TO THE TOUCHLINE</span><h2>BUILD YOUR<br /><span>BEST XI.</span></h2><p>Scout the talent. Set the shape. Own the match.<br />Your next great team starts here.</p><div className="hero-meta"><span>{players.length} players to discover</span><span>5 formations. Endless possibilities.</span></div></div>
        <div className="squad-scoreboard">
          <div className="scoreboard-heading"><span>MANAGER'S DESK</span><span className="squad-stamp">{draftedPlayers.length === 11 ? 'XI READY' : 'BUILDING XI'}</span></div>
          <div className="scoreboard-stats"><div><strong>{String(draftedPlayers.length).padStart(2, '0')}<small>/11</small></strong><span>PLAYERS SIGNED</span></div><div><strong>{calculateChemistry()}<small>%</small></strong><span>SQUAD CHEMISTRY</span></div><div><strong>{tactics.formation}</strong><span>FORMATION</span></div></div>
          <div className="budget-heading"><span>Transfer budget remaining</span><strong>{remainingBudget.toLocaleString()} <small>/ {budgetLimit.toLocaleString()} cr</small></strong></div>
          <div className="budget-track"><div style={{ width: `${Math.min(100, totalCost / budgetLimit * 100)}%` }} /></div>
          <div className="budget-controls"><span>Set your budget</span><div>{[-250, -100, 100, 250].map(change => <button key={change} title={`${change > 0 ? 'Increase' : 'Decrease'} Budget by ${Math.abs(change)} cr`} onClick={() => setBudgetLimit(prev => Math.min(5000, Math.max(500, totalCost, prev + change)))}>{change > 0 ? '+' : ''}{change}</button>)}</div></div>
        </div>
      </section>}

      {currentView === 'simulation' ? (
        <main className="flex-1 max-w-[1440px] w-full mx-auto p-4 md:p-6">
          <MatchSimulator
            players={draftedPlayers}
            tactics={tactics}
            chemistry={calculateChemistry()}
            slotAssignments={slotAssignments}
            onSimulationComplete={(result) => {
              setSimulationResult(result);
              setCurrentView('debrief');
            }}
            onBack={() => setCurrentView('draft')}
          />
        </main>
      ) : currentView === 'debrief' && simulationResult ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
          <DebriefRoom
            players={draftedPlayers}
            tactics={tactics}
            chemistry={calculateChemistry()}
            matchResult={simulationResult}
            onReset={() => {
              setSimulationResult(null);
              setCurrentView('draft');
            }}
          />
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-4">
          
          <nav className="workspace-tabs" aria-label="Workspace">
            <button id="mode-tab-squad" aria-pressed={activeDraftTab === 'roster'} onClick={() => setActiveDraftTab('roster')}><span>01</span> Squad Builder & Roster <Award size={18} /></button>
            <button id="mode-tab-analytics" aria-pressed={activeDraftTab === 'live-analytics'} onClick={() => setActiveDraftTab('live-analytics')}><span>02</span> Live AI Analytics Hub <Activity size={18} /></button>
            <span className="workspace-label">THE GAME PLAN STARTS HERE</span>
          </nav>

          <AnimatePresence mode="wait">
            {activeDraftTab === 'live-analytics' ? (
              <motion.div
                key="analytics-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full"
              >
                <LiveAnalyticsHub
                  onAddPlayerToCatalog={handleImportLivePlayer}
                  playersCatalog={players}
                weights={weights}
                  tactics={tactics}
                  chemistry={calculateChemistry()}
                  triggerAlert={triggerAlert}
                />
              </motion.div>
            ) : (
              <motion.div
                key="squad-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                <div className="lg:col-span-7 catalog-column flex flex-col space-y-4">
          <div className="bg-[#142238] border border-white/8 rounded-2xl p-4 flex flex-col gap-4 shadow-xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#B0BACB]" />
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-[#FFF7E9]">The Scouting Room</h2>
                  <p className="text-xs text-[#A6B1C3] font-sans mt-0.5">Static player catalog · Game attributes</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowWeightsConfig(!showWeightsConfig)}
                className="flex items-center gap-1.5 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 border border-slate-700/50 rounded-lg text-xs font-sans transition-all cursor-pointer"
                id="toggle-pricing-config"
              >
                <Settings className="w-3.5 h-3.5" />
                Valuation Weights
              </button>
            </div>

            <AnimatePresence>
              {showWeightsConfig && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-slate-800/60 pb-2.5"
                  id="pricing-config-panel"
                >
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-sans text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-orange-500" />
                        Regression Weights Configuration
                      </span>
                      <button
                        onClick={handleResetWeights}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200"
                        title="Reset to defaults"
                        id="reset-weights-btn"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 leading-normal font-normal">
                      Weights dynamically compute relative market pricing for each athlete. Normalization fits the 1000 credit cap.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-sans text-slate-400 uppercase">OVR Rating ({Math.round(weights.ratingWeight * 100)}%)</label>
                        <input 
                          type="range" min="0" max="1" step="0.05"
                          value={weights.ratingWeight}
                          onChange={(e) => setWeights({ ...weights, ratingWeight: parseFloat(e.target.value) })}
                          className="w-full accent-orange-500 h-1 mt-1 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-sans text-slate-400 uppercase">Goals ({Math.round(weights.goalsWeight * 100)}%)</label>
                        <input 
                          type="range" min="0" max="1" step="0.05"
                          value={weights.goalsWeight}
                          onChange={(e) => setWeights({ ...weights, goalsWeight: parseFloat(e.target.value) })}
                          className="w-full accent-orange-500 h-1 mt-1 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-sans text-slate-400 uppercase">Assists ({Math.round(weights.assistsWeight * 100)}%)</label>
                        <input 
                          type="range" min="0" max="1" step="0.05"
                          value={weights.assistsWeight}
                          onChange={(e) => setWeights({ ...weights, assistsWeight: parseFloat(e.target.value) })}
                          className="w-full accent-orange-500 h-1 mt-1 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-sans text-slate-400 uppercase">xG90 ({Math.round(weights.xG90Weight * 100)}%)</label>
                        <input 
                          type="range" min="0" max="1" step="0.05"
                          value={weights.xG90Weight}
                          onChange={(e) => setWeights({ ...weights, xG90Weight: parseFloat(e.target.value) })}
                          className="w-full accent-orange-500 h-1 mt-1 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-sans text-slate-400 uppercase">Defending ({Math.round(weights.defendingWeight * 100)}%)</label>
                        <input 
                          type="range" min="0" max="1" step="0.05"
                          value={weights.defendingWeight}
                          onChange={(e) => setWeights({ ...weights, defendingWeight: parseFloat(e.target.value) })}
                          className="w-full accent-orange-500 h-1 mt-1 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-sans text-slate-400 uppercase">Stamina ({Math.round(weights.staminaWeight * 100)}%)</label>
                        <input 
                          type="range" min="0" max="1" step="0.05"
                          value={weights.staminaWeight}
                          onChange={(e) => setWeights({ ...weights, staminaWeight: parseFloat(e.target.value) })}
                          className="w-full accent-orange-500 h-1 mt-1 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, club, or nationality..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-orange-500/80 focus:outline-none rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 transition-colors placeholder:text-slate-400"
                  id="catalog-search-input"
                  aria-label="Search player catalog"
                />
              </div>

              <div className="w-full md:w-[180px]">
                <select
                  value={nationalityFilter}
                  onChange={(e) => setNationalityFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-orange-500/80 focus:outline-none rounded-xl px-3 py-2 text-sm text-slate-300 transition-colors"
                  id="catalog-nation-select"
                  aria-label="Filter by nationality"
                >
                  <option value="ALL">Nation: All Nations</option>
                  {nationalities.filter(n => n !== 'ALL').map((nat) => (
                    <option key={nat} value={nat}>
                      {nat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full md:w-[180px]">
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-orange-500/80 focus:outline-none rounded-xl px-3 py-2 text-sm text-slate-300 transition-colors"
                  id="catalog-sort-select"
                  aria-label="Sort player catalog"
                >
                  <option value="rating">Sort: OVR Rating</option>
                  <option value="price_desc">Sort: Cost (High-Low)</option>
                  <option value="price_asc">Sort: Cost (Low-High)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1.5 scrollbar-thin border-b border-slate-800/40">
              {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((pos) => {
                const isActive = positionFilter === pos;
                const reqCount = pos !== 'ALL' ? reqCounts[pos] : 0;
                const draftCount = pos !== 'ALL' ? draftedCounts[pos] : 0;
                const isFulfilled = pos !== 'ALL' && draftCount === reqCount;

                return (
                  <button
                    key={pos}
                    onClick={() => setPositionFilter(pos)}
                    className={`py-1.5 px-3.5 rounded-lg text-xs font-sans font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-orange-500/15 border border-orange-500/30 text-orange-400' 
                        : 'bg-slate-950/40 border border-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                    id={`filter-tab-${pos}`}
                  >
                    {pos}
                    {pos !== 'ALL' && (
                      <span className={`px-1 py-0.2 rounded text-xs ${
                        isFulfilled ? 'bg-orange-500/20 text-orange-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {draftCount}/{reqCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[60vh] min-h-[320px] lg:max-h-[140vh] lg:min-h-[600px] pr-1" id="players-catalog-grid">
            {filteredPlayers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredPlayers.map((player) => {
                  const isDrafted = draftedPlayers.some(p => p.id === player.id);
                  const requirements = getFormationRequiredCounts();
                  const currentCount = draftedPlayers.filter(p => p.position === player.position).length;
                  const isPosLimitReached = currentCount >= requirements[player.position];

                  return (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      isDrafted={isDrafted}
                      onDraft={handleDraftPlayer}
                      onRelease={handleReleasePlayer}
                      onScout={(p) => setScoutingPlayer(p)}
                      disabledDraft={isPosLimitReached}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 bg-slate-900/30 border border-slate-800 border-dashed rounded-2xl text-center">
                <p className="text-sm font-sans text-slate-400 mb-2">No players match the filter query.</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Can't find a specific player in the preloaded 500-player catalog? Switch to the <strong className="text-orange-400 font-sans">Live AI Analytics Hub</strong> above to search, model, and import any custom player instantly!
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 tactics-column flex flex-col space-y-4">
          <div className="bg-[#142238] border border-white/8 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <span className="text-xs font-sans font-bold text-[#B0BACB] uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-[#F48B56]" />
              Start with a classic XI
            </span>
            <p className="text-xs text-[#A6B1C3] font-sans leading-relaxed">
              Instantly import a fully configured 11-player squad. Perfect for exhibition matching!
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleLoadPresetSquad('Real Madrid', true)}
                className="py-1.5 px-2 bg-[#0B1423]/80 hover:bg-[#0F1B2E] border border-white/8 hover:border-[#F48B56]/30 text-xs font-sans font-bold text-[#F2EADB] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                🇪🇸 Real Madrid
              </button>
              <button
                onClick={() => handleLoadPresetSquad('Manchester City', true)}
                className="py-1.5 px-2 bg-[#0B1423]/80 hover:bg-[#0F1B2E] border border-white/8 hover:border-[#F48B56]/30 text-xs font-sans font-bold text-[#F2EADB] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                🏴󠁧󠁢󠁥󠁮󠁧󠁿 Man City
              </button>
              <button
                onClick={() => handleLoadPresetSquad('Argentina', false)}
                className="py-1.5 px-2 bg-[#0B1423]/80 hover:bg-[#0F1B2E] border border-white/8 hover:border-[#F48B56]/30 text-xs font-sans font-bold text-[#F2EADB] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                🇦🇷 Argentina
              </button>
              <button
                onClick={() => handleLoadPresetSquad('Spain', false)}
                className="py-1.5 px-2 bg-[#0B1423]/80 hover:bg-[#0F1B2E] border border-white/8 hover:border-[#F48B56]/30 text-xs font-sans font-bold text-[#F2EADB] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                🇪🇸 Spain
              </button>
            </div>
          </div>

          <div className="bg-[#142238] border border-white/8 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/8 pb-2">
              <span className="text-xs font-sans font-bold text-[#B0BACB] uppercase tracking-wider">Your game plan</span>
              <div className="flex gap-2">
                {draftedPlayers.length < 11 && (
                  <button
                    onClick={handleAutofillSquad}
                    className="flex items-center gap-1 py-1 px-2.5 bg-[#F48B56]/10 hover:bg-[#F48B56]/20 border border-[#F48B56]/20 hover:border-[#F48B56]/40 text-[#F48B56] rounded-lg text-xs font-sans transition-all cursor-pointer font-bold "
                    id="autofill-squad-btn"
                    title="Autofill remaining empty slots"
                  >
                    Autofill
                  </button>
                )}
                {draftedPlayers.length > 0 && (
                  <button
                    onClick={handleClearSquad}
                    className="flex items-center gap-1 py-1 px-2.5 bg-rose-950/15 hover:bg-rose-950/35 border border-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg text-xs font-sans transition-all cursor-pointer"
                    id="clear-roster-btn"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {FORMATIONS.map((form) => (
                <button
                  key={form}
                  onClick={() => {
                    setTactics({ ...tactics, formation: form });
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-sans font-bold border transition-all cursor-pointer ${
                    tactics.formation === form 
                      ? 'bg-[#F48B56] text-[#0B1423] border-[#F48B56] shadow-md' 
                      : 'bg-[#0B1423]/80 border-white/8 hover:border-white/16 text-[#F2EADB]'
                  }`}
                  id={`formation-select-${form}`}
                >
                  {form}
                </button>
              ))}
            </div>

            <div className="space-y-3.5 pt-2 border-t border-white/8">
              <span className="text-xs font-sans font-bold text-[#B0BACB] uppercase tracking-wider block">Tactical Sliders</span>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-[#B0BACB]">Defensive Line</span>
                  <span className="text-[#F48B56] font-bold">{tactics.defensiveLine === 50 ? 'Balanced' : tactics.defensiveLine > 65 ? 'High Press' : 'Deep Compact'} ({tactics.defensiveLine})</span>
                </div>
                <input 
                  type="range" min="10" max="90" step="5"
                  value={tactics.defensiveLine}
                  onChange={(e) => setTactics({ ...tactics, defensiveLine: parseInt(e.target.value) })}
                  className="w-full accent-orange-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-slate-400">Build-Up Tempo</span>
                  <span className="text-orange-400 font-bold">{tactics.tempo === 50 ? 'Balanced' : tactics.tempo > 65 ? 'Direct/Fast' : 'Slow Possession'} ({tactics.tempo})</span>
                </div>
                <input 
                  type="range" min="10" max="90" step="5"
                  value={tactics.tempo}
                  onChange={(e) => setTactics({ ...tactics, tempo: parseInt(e.target.value) })}
                  className="w-full accent-orange-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-slate-400">Pressing Intensity</span>
                  <span className="text-orange-400 font-bold">{tactics.pressingIntensity === 50 ? 'Balanced' : tactics.pressingIntensity > 65 ? 'Gegenpress' : 'Passive'} ({tactics.pressingIntensity})</span>
                </div>
                <input 
                  type="range" min="10" max="90" step="5"
                  value={tactics.pressingIntensity}
                  onChange={(e) => setTactics({ ...tactics, pressingIntensity: parseInt(e.target.value) })}
                  className="w-full accent-orange-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {draftedPlayers.length > 0 && (
              <div className="pt-2 border-t border-slate-800/60 space-y-2">
                <button
                  onClick={() => setCurrentView('simulation')}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-orange-500/10 cursor-pointer flex items-center justify-center gap-2"
                  id="proceed-to-sim-btn"
                >
                  <Star className="w-4 h-4 fill-current" />
                  Proceed to Simulation
                </button>
                {draftedPlayers.length < 11 && (
                  <p className="text-xs text-amber-500 font-sans text-center leading-normal">
                    ⚠️ Roster incomplete ({draftedPlayers.length}/11). Reserve fill-ins will be used during simulation.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-[500px]">
            <SquadPitch
              players={draftedPlayers}
              formation={tactics.formation}
              onRelease={handleReleasePlayer}
              onScout={(p) => setScoutingPlayer(p)}
              onFocusSearch={(pos) => setPositionFilter(pos)}
              slotAssignments={slotAssignments}
              onPositionChange={handlePositionChange}
              onAssignSlot={(slotId, playerId) => {
                setSlotAssignments(prev => {
                  const updated = { ...prev };
                  if (playerId === null) {
                    delete updated[slotId];
                  } else {
                    Object.keys(updated).forEach(k => {
                      if (updated[k] === playerId) {
                        delete updated[k];
                      }
                    });
                    updated[slotId] = playerId;
                  }
                  return updated;
                });
              }}
            />
          </div>
        </div>
              </motion.div>
            )}
          </AnimatePresence>
      </main>
      )}

      <AnimatePresence>
        {alertMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg ${
              alertMessage.type === 'error' 
                ? 'bg-rose-950 border-rose-500/40 text-rose-200' 
                : 'bg-orange-950 border-orange-500/40 text-orange-200'
            }`}
            role="status" aria-live="polite" id="system-toast-alert"
          >
            {alertMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0" />
            )}
            <span className="text-xs font-semibold">{alertMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {scoutingPlayer && (
          <ScoutReport
            player={scoutingPlayer}
            onClose={() => setScoutingPlayer(null)}
            onDraft={() => handleDraftPlayer(scoutingPlayer)}
            onRelease={() => handleReleasePlayer(scoutingPlayer)}
            isDrafted={draftedPlayers.some(p => p.id === scoutingPlayer.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
