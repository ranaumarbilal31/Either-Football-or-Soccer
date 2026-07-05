import React, { useState, useEffect } from 'react';
import { 
  getPlayersWithDynamicPrices, 
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

  useEffect(() => {
    const sessionKey = 'football-app-session-id';
    const currentSession = sessionStorage.getItem(sessionKey);
    
    if (!currentSession) {
      localStorage.clear();
      sessionStorage.setItem(sessionKey, Date.now().toString());
    }
  }, []);

  const [isFreshSession, setIsFreshSession] = useState(true);

  useEffect(() => {
    const sessionKey = 'football-app-session-id';
    const currentSession = sessionStorage.getItem(sessionKey);
    
    if (currentSession && isFreshSession) {
      setIsFreshSession(false);
    }
  }, [isFreshSession]);

  const [weights, setWeights] = useState<PricingWeights>(() => {
    const saved = localStorage.getItem('pricing_weights');
    return saved ? JSON.parse(saved) : DEFAULT_PRICING_WEIGHTS;
  });
  const [showWeightsConfig, setShowWeightsConfig] = useState(false);

  const [playersList, setPlayersList] = useState<Player[]>([]);
  useEffect(() => {
    setPlayersList(getPlayersWithDynamicPrices(weights));
  }, [weights]);

  const [customPlayers, setCustomPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('custom_scouted_players');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('custom_scouted_players', JSON.stringify(customPlayers));
  }, [customPlayers]);

  const [players, setPlayers] = useState<Player[]>([]);
  useEffect(() => {
    const basePlayers = getPlayersWithDynamicPrices(weights);
    
    const pricedCustom = customPlayers.map((p) => {
      const s = p.stats;
      const normRating = (p.rating - 70) / 25;
      const normGoals = Math.min(s.goals / 40, 1);
      const normAssists = Math.min(s.assists / 20, 1);
      const normXG = Math.min(s.xG90 / 1.0, 1);
      const normXA = Math.min(s.xA90 / 0.5, 1);
      const normDef = s.defense / 100;
      const normStam = s.stamina / 100;

      const score = 
        normRating * weights.ratingWeight +
        normGoals * weights.goalsWeight +
        normAssists * weights.assistsWeight +
        normXG * weights.xG90Weight +
        normXA * weights.xA90Weight +
        normDef * weights.defendingWeight +
        normStam * weights.staminaWeight;

      const minPossibleScore = 0.05;
      const maxPossibleScore = 0.85;
      const range = maxPossibleScore - minPossibleScore;
      const ratio = Math.max(0, Math.min((score - minPossibleScore) / range, 1));
      const price = Math.round(45 + ratio * (165 - 45));

      return {
        ...p,
        price,
      };
    });

    setPlayers([...basePlayers, ...pricedCustom]);
  }, [weights, customPlayers]);

  const handleImportLivePlayer = (newPlayer: Player) => {
    if (customPlayers.some(p => p.id === newPlayer.id || p.name.toLowerCase() === newPlayer.name.toLowerCase())) {
      triggerAlert('error', `${newPlayer.name} is already in your scouting catalog!`);
      return;
    }
    setCustomPlayers(prev => [newPlayer, ...prev]);
  };

  const [activeDraftTab, setActiveDraftTab] = useState<'roster' | 'live-analytics'>('live-analytics');

  const [draftedPlayers, setDraftedPlayers] = useState<Player[]>([]);

  const [tactics, setTactics] = useState<Tactics>(() => {
    const saved = localStorage.getItem('squad_tactics');
    return saved ? JSON.parse(saved) : {
      formation: '4-3-3',
      defensiveLine: 50,
      tempo: 50,
      pressingIntensity: 50
    };
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState<PositionType | 'ALL'>('ALL');
  const [nationalityFilter, setNationalityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'rating' | 'price_asc' | 'price_desc'>('rating');
  const [scoutingPlayer, setScoutingPlayer] = useState<Player | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const [slotAssignments, setSlotAssignments] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('slot_assignments');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('slot_assignments', JSON.stringify(slotAssignments));
  }, [slotAssignments]);

  useEffect(() => {
    const currentLayout = getFormationLayout(tactics.formation);
    const newAssignments = { ...slotAssignments };

    Object.keys(newAssignments).forEach((slotId) => {
      const playerId = newAssignments[slotId];
      if (!draftedPlayers.some((p) => p.id === playerId)) {
        delete newAssignments[slotId];
      }
    });

    Object.keys(newAssignments).forEach((slotId) => {
      if (!currentLayout.some((s) => s.id === slotId)) {
        delete newAssignments[slotId];
      }
    });

    draftedPlayers.forEach((player) => {
      const isAssigned = Object.values(newAssignments).includes(player.id);
      if (!isAssigned) {
        const emptySlot = currentLayout.find(
          (slot) => slot.positionType === player.position && !newAssignments[slot.id]
        );
        if (emptySlot) {
          newAssignments[emptySlot.id] = player.id;
        } else {
          const anyEmptySlot = currentLayout.find((slot) => !newAssignments[slot.id]);
          if (anyEmptySlot) {
            newAssignments[anyEmptySlot.id] = player.id;
          }
        }
      }
    });

    if (JSON.stringify(newAssignments) !== JSON.stringify(slotAssignments)) {
      setSlotAssignments(newAssignments);
    }
  }, [draftedPlayers, tactics.formation]);

  const nationalities = React.useMemo(() => {
    const nats = players.map(p => p.nationality);
    const unique = Array.from(new Set(nats)).filter(Boolean).sort();
    return ['ALL', ...unique];
  }, [players]);

  const [currentView, setCurrentView] = useState<'draft' | 'simulation' | 'debrief'>('draft');
  const [simulationResult, setSimulationResult] = useState<MatchResult | null>(null);

  const calculateChemistry = (): number => {
    if (draftedPlayers.length < 2) return 0;
    let chem = 0;
    const clubs: Record<string, number> = {};
    const nationalities: Record<string, number> = {};

    draftedPlayers.forEach((p) => {
      clubs[p.club] = (clubs[p.club] || 0) + 1;
      nationalities[p.nationality] = (nationalities[p.nationality] || 0) + 1;
    });

    Object.values(nationalities).forEach((count) => {
      if (count >= 2) chem += (count - 1) * 6;
    });

    Object.values(clubs).forEach((count) => {
      if (count >= 2) chem += (count - 1) * 10;
    });

    const hasTargetMan = draftedPlayers.some((p) => p.playstyles.includes('Target Man'));
    const hasHighCrossing = draftedPlayers.some((p) => p.playstyles.includes('High Crossing'));
    const hasDoublePivot = draftedPlayers.filter((p) => p.playstyles.includes('Double Pivot')).length >= 2;
    const hasWingBack = draftedPlayers.some((p) => p.playstyles.includes('Wing Back'));
    const hasBoxToBox = draftedPlayers.some((p) => p.playstyles.includes('Box-to-Box'));

    if (hasTargetMan && hasHighCrossing) chem += 15;
    if (hasDoublePivot) chem += 10;
    if (hasWingBack && hasBoxToBox) chem += 8;

    return Math.min(chem, 100);
  };

  useEffect(() => {
    localStorage.setItem('drafted_players', JSON.stringify(draftedPlayers));
  }, [draftedPlayers]);

  useEffect(() => {
    localStorage.setItem('squad_tactics', JSON.stringify(tactics));
  }, [tactics]);

  useEffect(() => {
    localStorage.setItem('pricing_weights', JSON.stringify(weights));
  }, [weights]);

  const triggerAlert = (type: 'error' | 'success', text: string) => {
    setAlertMessage({ type, text });
    setTimeout(() => {
      setAlertMessage(null);
    }, 4000);
  };

  const handlePositionChange = (player: Player, newPosition: string) => {
    // Check if trying to place a non-GK in GK position
    if (newPosition === 'GK' && player.position !== 'GK') {
      triggerAlert('error', 'Only goalkeepers can be placed in the GK position!');
      return;
    }

    // Update the player's position
    setDraftedPlayers(prev => 
      prev.map(p => 
        p.id === player.id 
          ? { ...p, position: newPosition as PositionType }
          : p
      )
    );
  };

  const [budgetLimit, setBudgetLimit] = useState<number>(() => {
    const saved = localStorage.getItem('budget_limit');
    return saved ? parseInt(saved, 10) : 1000;
  });

  useEffect(() => {
    localStorage.setItem('budget_limit', budgetLimit.toString());
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
    const requirements = getFormationRequiredCounts();
    let currentSquad = [...draftedPlayers];
    let currentCost = currentSquad.reduce((acc, p) => acc + p.price, 0);

    const positions: PositionType[] = ['GK', 'DEF', 'MID', 'FWD'];
    let filledAny = false;

    for (const pos of positions) {
      const needed = requirements[pos];
      const currentCount = currentSquad.filter(p => p.position === pos).length;
      
      if (currentCount < needed) {
        const slotsToFill = needed - currentCount;
        
        const undraftedCandidates = players
          .filter(p => p.position === pos && !currentSquad.some(s => s.id === p.id))
          .sort((a, b) => b.rating - a.rating);

        let candidatesAdded = 0;
        for (const candidate of undraftedCandidates) {
          if (candidatesAdded >= slotsToFill) break;
          
          if (currentCost + candidate.price <= budgetLimit) {
            currentSquad.push(candidate);
            currentCost += candidate.price;
            candidatesAdded++;
            filledAny = true;
          }
        }
      }
    }

    if (filledAny) {
      setDraftedPlayers(currentSquad);
      triggerAlert('success', 'Squad successfully autofilled with top-tier players!');
    } else if (currentSquad.length === 11) {
      triggerAlert('error', 'Squad is already full!');
    } else {
      triggerAlert('error', 'Insufficient remaining budget to autofill the squad with quality players!');
    }
  };

  const handleLoadPresetSquad = (name: string, isClub: boolean) => {
    let presetFormation: FormationType = '4-3-3';
    if (name === 'France' || name === 'Bayern Munich' || name === 'Germany' || name === 'England') {
      presetFormation = '4-2-3-1';
    } else if (name === 'Inter Milan' || name === 'Bayer Leverkusen') {
      presetFormation = '3-5-2';
    }

    setTactics(prev => ({ ...prev, formation: presetFormation }));

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
    <div className="min-h-screen bg-[#0A0A0C] text-[#F2F2F0] flex flex-col font-sans selection:bg-[#3ECF8E] selection:text-[#0A0A0C] relative overflow-hidden">
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />
      
      <header className="bg-[#0A0A0C]/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 shrink-0">
              <img src="/logo.webp" alt="Either Football or Soccer logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-[#FAFAF8] flex items-center gap-2">
                Either Football or Soccer
              </h1>
              <p className="text-xs font-mono text-[#8A8A93] mt-0.5">
                Build Your Dream XI, Simulate Matches, and Analyze Performance with AI Insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[#131316] border border-white/8 p-3 rounded-xl min-w-[320px]">
            <Coins className="w-5 h-5 text-[#3ECF8E] animate-pulse shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between items-center text-[10px] font-mono uppercase text-[#9C9CA4] mb-1">
                <span>Roster Budget Allocation</span>
                <span className="font-bold text-[#3ECF8E]">{remainingBudget} / {budgetLimit} cr</span>
              </div>
              <div className="w-full bg-[#0A0A0C] h-2 rounded-full overflow-hidden border border-white/8">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    remainingBudget < 100 ? 'bg-rose-500' : remainingBudget < 300 ? 'bg-amber-500' : 'bg-[#3ECF8E]'
                  }`}
                  style={{ width: `${Math.min((totalCost / budgetLimit) * 100, 100)}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between gap-1 mt-2 pt-1.5 border-t border-white/8">
                <span className="text-[9px] font-mono text-[#8A8A93]">Adjust Limit:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setBudgetLimit(prev => Math.max(500, prev - 100))}
                    className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[10px] font-mono rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Decrease Budget by 100 cr"
                  >
                    -100 cr
                  </button>
                  <button
                    onClick={() => setBudgetLimit(prev => Math.max(500, prev - 250))}
                    className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[10px] font-mono rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Decrease Budget by 250 cr"
                  >
                    -250 cr
                  </button>
                  <div className="h-3 w-px bg-slate-800 mx-0.5" />
                  <button
                    onClick={() => setBudgetLimit(prev => Math.min(5000, prev + 100))}
                    className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[10px] font-mono rounded text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    title="Increase Budget by 100 cr"
                  >
                    +100 cr
                  </button>
                  <button
                    onClick={() => setBudgetLimit(prev => Math.min(5000, prev + 250))}
                    className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[10px] font-mono rounded text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    title="Increase Budget by 250 cr"
                  >
                    +250 cr
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#3ECF8E] to-emerald-400 origin-left z-50"
        style={{ scaleX }}
      />

      {currentView === 'simulation' ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
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
          
          <div className="flex gap-2.5 pb-2 border-b border-white/8">
            <button
              onClick={() => setActiveDraftTab('live-analytics')}
              className={`py-3 px-5 rounded-xl text-xs font-mono font-bold tracking-widest uppercase transition-all cursor-pointer flex items-center gap-2 relative ${
                activeDraftTab === 'live-analytics'
                  ? 'bg-[#3ECF8E] text-[#0A0A0C] shadow-md shadow-[#3ECF8E]/10'
                  : 'bg-[#131316] border border-white/8 hover:border-white/16 text-[#F2F2F0]'
              }`}
              id="mode-tab-analytics"
            >
              <Activity className="w-4 h-4 animate-pulse text-[#3ECF8E]" />
              Live AI Analytics Hub
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </button>
            <button
              onClick={() => setActiveDraftTab('roster')}
              className={`py-3 px-5 rounded-xl text-xs font-mono font-bold tracking-widest uppercase transition-all cursor-pointer flex items-center gap-2 ${
                activeDraftTab === 'roster'
                  ? 'bg-[#3ECF8E] text-[#0A0A0C] shadow-md shadow-[#3ECF8E]/10'
                  : 'bg-[#131316] border border-white/8 hover:border-white/16 text-[#F2F2F0]'
              }`}
              id="mode-tab-squad"
            >
              <Award className="w-4 h-4" />
              Squad Builder & Roster
            </button>
          </div>

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
                <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="bg-[#131316] border border-white/8 rounded-2xl p-4 flex flex-col gap-4 shadow-xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#9C9CA4]" />
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-[#FAFAF8]">Player Scouting Hub</h2>
                  <p className="text-[10px] text-[#8A8A93] font-mono mt-0.5">500+ Top League Players Preloaded</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowWeightsConfig(!showWeightsConfig)}
                className="flex items-center gap-1.5 py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 border border-slate-700/50 rounded-lg text-xs font-mono transition-all cursor-pointer"
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
                      <span className="text-xs font-mono text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-500" />
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
                    <p className="text-[11px] text-slate-500 leading-normal font-normal">
                      Weights dynamically compute relative market pricing for each athlete. Normalization fits the 1000 credit cap.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-mono text-slate-500 uppercase">OVR Rating ({Math.round(weights.ratingWeight * 100)}%)</label>
                        <input 
                          type="range" min="0" max="1" step="0.05"
                          value={weights.ratingWeight}
                          onChange={(e) => setWeights({ ...weights, ratingWeight: parseFloat(e.target.value) })}
                          className="w-full accent-emerald-500 h-1 mt-1 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-slate-500 uppercase">Goals ({Math.round(weights.goalsWeight * 100)}%)</label>
                        <input 
                          type="range" min="0" max="1" step="0.05"
                          value={weights.goalsWeight}
                          onChange={(e) => setWeights({ ...weights, goalsWeight: parseFloat(e.target.value) })}
                          className="w-full accent-emerald-500 h-1 mt-1 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-slate-500 uppercase">Assists ({Math.round(weights.assistsWeight * 100)}%)</label>
                        <input 
                          type="range" min="0" max="1" step="0.05"
                          value={weights.assistsWeight}
                          onChange={(e) => setWeights({ ...weights, assistsWeight: parseFloat(e.target.value) })}
                          className="w-full accent-emerald-500 h-1 mt-1 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-slate-500 uppercase">xG90 ({Math.round(weights.xG90Weight * 100)}%)</label>
                        <input 
                          type="range" min="0" max="1" step="0.05"
                          value={weights.xG90Weight}
                          onChange={(e) => setWeights({ ...weights, xG90Weight: parseFloat(e.target.value) })}
                          className="w-full accent-emerald-500 h-1 mt-1 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-slate-500 uppercase">Defending ({Math.round(weights.defendingWeight * 100)}%)</label>
                        <input 
                          type="range" min="0" max="1" step="0.05"
                          value={weights.defendingWeight}
                          onChange={(e) => setWeights({ ...weights, defendingWeight: parseFloat(e.target.value) })}
                          className="w-full accent-emerald-500 h-1 mt-1 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-mono text-slate-500 uppercase">Stamina ({Math.round(weights.staminaWeight * 100)}%)</label>
                        <input 
                          type="range" min="0" max="1" step="0.05"
                          value={weights.staminaWeight}
                          onChange={(e) => setWeights({ ...weights, staminaWeight: parseFloat(e.target.value) })}
                          className="w-full accent-emerald-500 h-1 mt-1 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, club, or nationality..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500/80 focus:outline-none rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 transition-colors placeholder:text-slate-600"
                  id="catalog-search-input"
                />
              </div>

              <div className="w-full md:w-[180px]">
                <select
                  value={nationalityFilter}
                  onChange={(e) => setNationalityFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500/80 focus:outline-none rounded-xl px-3 py-2 text-sm text-slate-300 transition-colors"
                  id="catalog-nation-select"
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
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500/80 focus:outline-none rounded-xl px-3 py-2 text-sm text-slate-300 transition-colors"
                  id="catalog-sort-select"
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
                    className={`py-1.5 px-3.5 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' 
                        : 'bg-slate-950/40 border border-slate-800/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                    id={`filter-tab-${pos}`}
                  >
                    {pos}
                    {pos !== 'ALL' && (
                      <span className={`px-1 py-0.2 rounded text-[9px] ${
                        isFulfilled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {draftCount}/{reqCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[140vh] min-h-[600px] pr-1" id="players-catalog-grid">
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
                <p className="text-sm font-mono text-slate-400 mb-2">No players match the filter query.</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Can't find a specific player in the preloaded 500-player catalog? Switch to the <strong className="text-emerald-400 font-mono">Live AI Analytics Hub</strong> above to search, model, and import any custom player instantly!
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-[#131316] border border-white/8 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <span className="text-xs font-mono font-bold text-[#9C9CA4] uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-[#3ECF8E]" />
              Quick-Draft Preset Squad
            </span>
            <p className="text-[10px] text-[#8A8A93] font-mono leading-relaxed">
              Instantly import a fully configured 11-player squad. Perfect for exhibition matching!
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleLoadPresetSquad('Real Madrid', true)}
                className="py-1.5 px-2 bg-[#0A0A0C]/80 hover:bg-[#0D0D10] border border-white/8 hover:border-[#3ECF8E]/30 text-[10px] font-mono font-bold text-[#F2F2F0] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                🇪🇸 Real Madrid
              </button>
              <button
                onClick={() => handleLoadPresetSquad('Manchester City', true)}
                className="py-1.5 px-2 bg-[#0A0A0C]/80 hover:bg-[#0D0D10] border border-white/8 hover:border-[#3ECF8E]/30 text-[10px] font-mono font-bold text-[#F2F2F0] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                🏴󠁧󠁢󠁥󠁮󠁧󠁿 Man City
              </button>
              <button
                onClick={() => handleLoadPresetSquad('Argentina', false)}
                className="py-1.5 px-2 bg-[#0A0A0C]/80 hover:bg-[#0D0D10] border border-white/8 hover:border-[#3ECF8E]/30 text-[10px] font-mono font-bold text-[#F2F2F0] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                🇦🇷 Argentina
              </button>
              <button
                onClick={() => handleLoadPresetSquad('Spain', false)}
                className="py-1.5 px-2 bg-[#0A0A0C]/80 hover:bg-[#0D0D10] border border-white/8 hover:border-[#3ECF8E]/30 text-[10px] font-mono font-bold text-[#F2F2F0] rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                🇪🇸 Spain
              </button>
            </div>
          </div>

          <div className="bg-[#131316] border border-white/8 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/8 pb-2">
              <span className="text-xs font-mono font-bold text-[#9C9CA4] uppercase tracking-wider">Formation Settings</span>
              <div className="flex gap-2">
                {draftedPlayers.length < 11 && (
                  <button
                    onClick={handleAutofillSquad}
                    className="flex items-center gap-1 py-1 px-2.5 bg-[#3ECF8E]/10 hover:bg-[#3ECF8E]/20 border border-[#3ECF8E]/20 hover:border-[#3ECF8E]/40 text-[#3ECF8E] rounded-lg text-xs font-mono transition-all cursor-pointer font-bold animate-pulse"
                    id="autofill-squad-btn"
                    title="Autofill remaining empty slots"
                  >
                    Autofill
                  </button>
                )}
                {draftedPlayers.length > 0 && (
                  <button
                    onClick={handleClearSquad}
                    className="flex items-center gap-1 py-1 px-2.5 bg-rose-950/15 hover:bg-rose-950/35 border border-rose-500/20 text-rose-400 hover:text-rose-300 rounded-lg text-xs font-mono transition-all cursor-pointer"
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
                  className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                    tactics.formation === form 
                      ? 'bg-[#3ECF8E] text-[#0A0A0C] border-[#3ECF8E] shadow-md' 
                      : 'bg-[#0A0A0C]/80 border-white/8 hover:border-white/16 text-[#F2F2F0]'
                  }`}
                  id={`formation-select-${form}`}
                >
                  {form}
                </button>
              ))}
            </div>

            <div className="space-y-3.5 pt-2 border-t border-white/8">
              <span className="text-xs font-mono font-bold text-[#9C9CA4] uppercase tracking-wider block">Tactical Sliders</span>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#9C9CA4]">Defensive Line</span>
                  <span className="text-[#3ECF8E] font-bold">{tactics.defensiveLine === 50 ? 'Balanced' : tactics.defensiveLine > 65 ? 'High Press' : 'Deep Compact'} ({tactics.defensiveLine})</span>
                </div>
                <input 
                  type="range" min="10" max="90" step="5"
                  value={tactics.defensiveLine}
                  onChange={(e) => setTactics({ ...tactics, defensiveLine: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Build-Up Tempo</span>
                  <span className="text-emerald-400 font-bold">{tactics.tempo === 50 ? 'Balanced' : tactics.tempo > 65 ? 'Direct/Fast' : 'Slow Possession'} ({tactics.tempo})</span>
                </div>
                <input 
                  type="range" min="10" max="90" step="5"
                  value={tactics.tempo}
                  onChange={(e) => setTactics({ ...tactics, tempo: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Pressing Intensity</span>
                  <span className="text-emerald-400 font-bold">{tactics.pressingIntensity === 50 ? 'Balanced' : tactics.pressingIntensity > 65 ? 'Gegenpress' : 'Passive'} ({tactics.pressingIntensity})</span>
                </div>
                <input 
                  type="range" min="10" max="90" step="5"
                  value={tactics.pressingIntensity}
                  onChange={(e) => setTactics({ ...tactics, pressingIntensity: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500 h-1 bg-slate-950 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {draftedPlayers.length > 0 && (
              <div className="pt-2 border-t border-slate-800/60 space-y-2">
                <button
                  onClick={() => setCurrentView('simulation')}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-2"
                  id="proceed-to-sim-btn"
                >
                  <Star className="w-4 h-4 fill-current" />
                  Proceed to Simulation
                </button>
                {draftedPlayers.length < 11 && (
                  <p className="text-[10px] text-amber-500 font-mono text-center leading-normal">
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
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-2xl ${
              alertMessage.type === 'error' 
                ? 'bg-rose-950 border-rose-500/40 text-rose-200' 
                : 'bg-emerald-950 border-emerald-500/40 text-emerald-200'
            }`}
            id="system-toast-alert"
          >
            {alertMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
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
