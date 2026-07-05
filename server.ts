import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json());

const APP_SECRET = process.env.APP_SECRET || 'football-app-secret-2024';

const apiSecurityMiddleware = (req: any, res: any, next: any) => {
  const clientSecret = req.headers['x-app-secret'];
  if (clientSecret !== APP_SECRET) {
    return res.status(403).json({ error: 'Unauthorized access' });
  }
  next();
};

const PORT = 3000;

function generateLocalCoachSummary(matchResult: any, tactics: any, chemistry: number): string {
  const formation = tactics?.formation || '4-3-3';
  const homeScore = matchResult.homeScore;
  const awayScore = matchResult.awayScore;
  const oppName = matchResult.awayTeamName || 'Opposition';
  const homeXG = matchResult.stats.xG.home.toFixed(2);
  const awayXG = matchResult.stats.xG.away.toFixed(2);
  const homePassAcc = matchResult.stats.passAccuracy.home;
  
  let outcomeTitle = '';
  let outcomeDesc = '';
  if (homeScore > awayScore) {
    outcomeTitle = `Clinched Victory (${homeScore} - ${awayScore})`;
    outcomeDesc = `An impressive tactical performance today. We successfully contained ${oppName}'s attack while maintaining structural discipline on our offensive phases.`;
  } else if (homeScore < awayScore) {
    outcomeTitle = `Defeat on the Board (${homeScore} - ${awayScore})`;
    outcomeDesc = `A tough outcome today against ${oppName}. We were caught vulnerable in key moments, highlighting areas of tactical friction that require immediate refinement.`;
  } else {
    outcomeTitle = `Stalemate Draw (${homeScore} - ${awayScore})`;
    outcomeDesc = `A tightly contested encounter. Both squads neutralised each other's primary strengths, leaving us with a point but plenty of tactical film to review.`;
  }

  const defLine = tactics?.defensiveLine || 50;
  let defLineFeedback = '';
  if (defLine > 65) {
    defLineFeedback = `**High Press Block (D-Line: ${defLine}/100)**: Sitting high squeezed the space in midfield, allowing us to suffocate the opposition early. However, this aggressive line left substantial space behind our center-backs, making us highly susceptible to rapid vertical transitions and counter-attacks.`;
  } else if (defLine < 40) {
    defLineFeedback = `**Low Compact Block (D-Line: ${defLine}/100)**: Sitting in a deep, low block successfully reduced any space behind for runners, forcing ${oppName} to play in front of us. However, this deep posture invited continuous pressure and made it difficult to initiate quick vertical counters.`;
  } else {
    defLineFeedback = `**Balanced Mid-Block (D-Line: ${defLine}/100)**: Maintaining a medium line provided robust stability. It balanced the space behind our defensive line with active pressure in the middle third, though we sometimes lacked aggression in high turnover zones.`;
  }

  const tempo = tactics?.tempo || 50;
  let tempoFeedback = '';
  if (tempo > 65) {
    tempoFeedback = `**High-Octane Transitions (Tempo: ${tempo}/100)**: The rapid tempo accelerated our transitions, but at times it compromised our possession structure. Our passing accuracy of **${homePassAcc}%** shows we frequently rushed key distribution phases under pressure.`;
  } else if (tempo < 40) {
    tempoFeedback = `**Calculated Build-up (Tempo: ${tempo}/100)**: A deliberate, low-tempo possession model allowed us to control the rhythm and sustain phases of play. However, it sometimes became overly predictable, allowing ${oppName}'s low block to slide into position and suffocate our forward options.`;
  } else {
    tempoFeedback = `**Controlled Cadence (Tempo: ${tempo}/100)**: A balanced tempo allowed us to transition dynamically when the option was on, while comfortably recycling the ball when the spaces were closed. Passing accuracy was solid at **${homePassAcc}%**.`;
  }

  const pressing = tactics?.pressingIntensity || 50;
  let pressingFeedback = '';
  if (pressing > 65) {
    pressingFeedback = `**Intense Pressing (Intensity: ${pressing}/100)**: We hunted in packs, forcing high-up turnovers in the middle third. However, this intense defensive model led to massive physical output. Stamina decay was severe in the final 20 minutes, leaving several key players exhausted.`;
  } else if (pressing < 40) {
    pressingFeedback = `**Passive Resettling (Intensity: ${pressing}/100)**: Conserving energy was the priority. We dropped back into our defensive shape instead of engaging. While this preserved stamina across the full 90 minutes, it allowed the opposition complete freedom to construct play.`;
  } else {
    pressingFeedback = `**Selective Trigger Pressing (Intensity: ${pressing}/100)**: We engaged in pressing triggers only when the ball was isolated on the wings or under a loose touch. This provided a healthy balance between winning turnovers and conserving squad stamina.`;
  }

  const goalEvents = matchResult.events.filter((e: any) => e.type === 'GOAL');
  const staminaWarnings = matchResult.events.filter((e: any) => e.type === 'STAMINA_WARNING');
  
  let standoutFeedback = '';
  if (goalEvents.length > 0) {
    const goalsList = goalEvents.map((g: any) => `* **${g.minute}'** - ${g.description}`).join('\n');
    standoutFeedback = `#### Major Match Events:\n${goalsList}`;
  } else {
    standoutFeedback = `#### Match Development:\n* No goals were recorded for our side, highlighting our lack of penetration and clinical edge in the final third today.`;
  }

  let staminaFeedback = '';
  if (staminaWarnings.length > 0) {
    const warningsList = staminaWarnings.map((w: any) => `* **${w.minute}'** - ${w.description}`).join('\n');
    staminaFeedback = `\n\n#### Stamina & Physical Load:\n${warningsList}\n* Our heavy out-of-possession pressing strategy caused severe energy drops. We must utilize our bench earlier.`;
  } else {
    staminaFeedback = `\n\n#### Stamina & Physical Load:\n* Players maintained their energy levels efficiently across the 90 minutes, indicating our tactical tempo and pressing intensity were physically sustainable for the selected roster.`;
  }

  let recommendation = '';
  if (homeScore < awayScore && parseFloat(homeXG) > parseFloat(awayXG)) {
    recommendation = `Lower the tempo slightly to improve passing accuracy and work on finishing drills in training. Our xG of **${homeXG}** indicates we created the chances, but failed to apply clinical finishing.`;
  } else if (staminaWarnings.length > 2) {
    recommendation = `Reduce the Pressing Intensity from **${pressing}/100** down to around **50/100** or make proactive substitutions around the 65th minute to maintain our shape without suffering from late-game fatigue.`;
  } else if (defLine > 70 && awayScore > 1) {
    recommendation = `Lower our Defensive Line slider below **55/100** to compress the space behind and prevent fast counters, as ${oppName} repeatedly breached our high line today.`;
  } else if (homeScore <= awayScore && defLine < 45) {
    recommendation = `Nudge our Defensive Line higher (above **60/100**) to compress the midfield gap and support our forwards, preventing our squad from getting pinned back too deep.`;
  } else {
    recommendation = `Maintain our current structural balance, but consider tweaking the tempo slider slightly depending on whether you want more ball control or direct vertical transitions next match.`;
  }

  return `### AI Tactical Report & Match Analysis (Local Engine)

#### 📋 Match Overview: ${outcomeTitle}
${outcomeDesc}

*   **Final Score**: Home **${homeScore}** - **${awayScore}** Away (${oppName})
*   **Expected Goals (xG)**: Home **${homeXG}** vs Away **${awayXG}**
*   **Squad Chemistry**: **${chemistry}%** synergy rating (Familiarity/Playstyle synergy)

---

#### 🧠 Tactical Breakdown:
*   ${defLineFeedback}
*   ${tempoFeedback}
*   ${pressingFeedback}

---

${standoutFeedback}
${staminaFeedback}

---

#### 📋 Manager's Tactical Recommendation:
👉 **${recommendation}**

*(Note: The Gemini API quota was temporarily exceeded, but our local football intelligence engine has successfully parsed your squad's performance.)*`;
}

app.post('/api/coach-summary', apiSecurityMiddleware, async (req, res) => {
  const { matchResult, tactics, chemistry } = req.body;
  
  if (!matchResult) {
    return res.status(400).json({ error: 'Missing matchResult details in body.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    const formation = tactics?.formation || '4-3-3';
    return res.json({
      summary: `### Tactical Report & Post-Match Debrief (Scouting Assistant Demo)

Your squad lineup completed the simulated match using a **${formation}** formation against **${matchResult.awayTeamName}**, resulting in a final score of **${matchResult.homeScore} - ${matchResult.awayScore}**.

#### Key Observations:
* **Tactical Balance**: With defensive line set at **${tactics?.defensiveLine}/100**, tempo at **${tactics?.tempo}/100**, and pressing intensity at **${tactics?.pressingIntensity}/100**, your tactical blueprint heavily influenced player performance. 
* **Midfield Friction**: The squad achieved a **${matchResult.stats.passAccuracy.home}%** pass accuracy. However, high-pressing intensity at **${tactics?.pressingIntensity}%** created dynamic stamina warnings in late stages.
* **Expected Goals (xG)**: Your team produced a cumulative expected goals value of **${matchResult.stats.xG.home.toFixed(2)}** compared to the opponent's **${matchResult.stats.xG.away.toFixed(2)}**. This indicates that the offensive structure was ${matchResult.homeScore >= matchResult.awayScore ? 'effective and clinically finished' : 'exposed during counter-attacks'}.

*To experience dynamically generated, fully custom-scouted summaries, specify a valid **GEMINI_API_KEY** in your workspace settings.*`,
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const majorEvents = matchResult.events
      .filter((e: any) => e.type === 'GOAL' || e.type === 'STAMINA_WARNING' || e.type === 'HALF_TIME')
      .map((e: any) => `- ${e.description}`)
      .join('\n');

    const prompt = `
      You are an elite, world-class football manager and pro-level StatsBomb analyst (possessing a sharp, analytical, authoritative yet passionate dressing-room style).
      Deliver a comprehensive, professional, and visually engaging post-match debrief for the manager who set up the home team. Use structured Markdown.
      
      MATCH METRICS:
      - Final Score: HOME (User) ${matchResult.homeScore} - ${matchResult.awayScore} AWAY (${matchResult.awayTeamName})
      - Tactics Configured: Formation: ${tactics?.formation || '4-3-3'}, Defensive Line: ${tactics?.defensiveLine}/100, Tempo: ${tactics?.tempo}/100, Pressing Intensity: ${tactics?.pressingIntensity}/100
      - Squad Synergy Chemistry: ${chemistry}%
      - Match Stats:
        * Possession: Home ${matchResult.stats.possession}% vs Away ${100 - matchResult.stats.possession}%
        * Shots: Home ${matchResult.stats.shots.home} vs Away ${matchResult.stats.shots.away}
        * Shots On Target: Home ${matchResult.stats.shotsOnTarget.home} vs Away ${matchResult.stats.shotsOnTarget.away}
        * Cumulative Expected Goals (xG): Home ${matchResult.stats.xG.home.toFixed(2)} vs Away ${matchResult.stats.xG.away.toFixed(2)}
        * Passing Accuracy: Home ${matchResult.stats.passAccuracy.home}% vs Away ${matchResult.stats.passAccuracy.away}%
      
      MATCH MAJOR EVENTS:
      ${majorEvents}

      REPORT OUTLINE:
      1. **Match Overview**: A sharp summary of the final score and who dominated the tactical board.
      2. **Tactical Breakdown**: Analyze their slider settings:
         - Defensive Line: How did high/deep line impact counters or defensive safety?
         - Tempo: Did fast play sacrifice accuracy? Did slow play suffocate?
         - Pressing: Analyze stamina drain versus defensive turnovers.
      3. **Standout & Fatigue Report**: Praise key players and highlight fatigued links.
      4. **Manager Recommendation**: Recommend one practical adjustment (e.g. adjust pressing to preserve stamina, or speed up transitions).
      
      Keep the tone highly realistic, analytical, and authoritative. Be direct, professional, and do not use generic AI intro/outro filler.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ summary: response.text });
  } catch (err: any) {
    console.error('Gemini Coach Summary error, falling back to local analysis:', err);
    const fallbackSummary = generateLocalCoachSummary(matchResult, tactics, chemistry);
    res.json({ summary: fallbackSummary });
  }
});

function mapPosition(posStr: string): 'GK' | 'DEF' | 'MID' | 'FWD' {
  const p = (posStr || '').toLowerCase();
  if (p.includes('goal') || p.includes('keeper') || p === 'gk') return 'GK';
  if (p.includes('def') || p.includes('back') || p === 'cb' || p === 'lb' || p === 'rb' || p.includes('protect')) return 'DEF';
  if (p.includes('mid') || p.includes('centre') || p === 'cm' || p === 'dm' || p === 'am' || p.includes('wing') || p.includes('half')) return 'MID';
  return 'FWD';
}

function generateDefaultStats(position: string) {
  const p = position || 'MID';
  if (p === 'GK') {
    return { goals: 0, assists: 0, passAccuracy: 75, defense: 80, physicality: 75, stamina: 65, pace: 50, dribbling: 45, xG90: 0, xA90: 0.01 };
  } else if (p === 'DEF') {
    return { goals: 1, assists: 1, passAccuracy: 82, defense: 81, physicality: 80, stamina: 82, pace: 75, dribbling: 65, xG90: 0.03, xA90: 0.05 };
  } else if (p === 'MID') {
    return { goals: 4, assists: 6, passAccuracy: 88, defense: 65, physicality: 72, stamina: 85, pace: 76, dribbling: 80, xG90: 0.12, xA90: 0.18 };
  } else {
    return { goals: 12, assists: 4, passAccuracy: 78, defense: 38, physicality: 72, stamina: 78, pace: 85, dribbling: 82, xG90: 0.45, xA90: 0.12 };
  }
}

function getPositionalPlaystyles(position: string): string[] {
  const p = position || 'MID';
  if (p === 'GK') return ['Sweeper Keeper', 'Reflex Wall'];
  if (p === 'DEF') return ['Block Master', 'Jockey Expert'];
  if (p === 'MID') return ['Pass Master', 'Box-to-Box'];
  return ['Sprint Machine', 'Infiltrator'];
}

app.get('/api/search-players', apiSecurityMiddleware, async (req, res) => {
  const query = String(req.query.search || '').trim();
  if (!query) {
    return res.json({ players: [] });
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  const apiHost = process.env.RAPIDAPI_HOST || 'free-api-live-football-data.p.rapidapi.com';

  const mockDatabase = [
    { name: 'Lionel Messi', position: 'FWD', club: 'Inter Miami', nationality: 'Argentina' },
    { name: 'Cristiano Ronaldo', position: 'FWD', club: 'Al Nassr', nationality: 'Portugal' },
    { name: 'Lamine Yamal', position: 'FWD', club: 'Barcelona', nationality: 'Spain' },
    { name: 'Cole Palmer', position: 'MID', club: 'Chelsea', nationality: 'England' },
    { name: 'Bruno Fernandes', position: 'MID', club: 'Manchester United', nationality: 'Portugal' },
    { name: 'Bukayo Saka', position: 'FWD', club: 'Arsenal', nationality: 'England' },
    { name: 'Phil Foden', position: 'MID', club: 'Manchester City', nationality: 'England' },
    { name: 'Florian Wirtz', position: 'MID', club: 'Bayer Leverkusen', nationality: 'Germany' },
    { name: 'Declan Rice', position: 'MID', club: 'Arsenal', nationality: 'England' },
    { name: 'William Saliba', position: 'DEF', club: 'Arsenal', nationality: 'France' },
    { name: 'Antonio Rüdiger', position: 'DEF', club: 'Real Madrid', nationality: 'Germany' },
    { name: 'Trent Alexander-Arnold', position: 'DEF', club: 'Liverpool', nationality: 'England' },
    { name: 'Alisson Becker', position: 'GK', club: 'Liverpool', nationality: 'Brazil' },
    { name: 'Marc-André ter Stegen', position: 'GK', club: 'Barcelona', nationality: 'Germany' }
  ];

  const matchedMocks = mockDatabase.filter(m => 
    m.name.toLowerCase().includes(query.toLowerCase()) ||
    m.club.toLowerCase().includes(query.toLowerCase()) ||
    m.nationality.toLowerCase().includes(query.toLowerCase())
  );

  if (!apiKey || apiKey === 'MY_RAPIDAPI_KEY' || apiKey.trim() === '') {
    return res.json({ players: matchedMocks });
  }

  try {
    const url = `https://${apiHost}/football-players-search?search=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': apiHost,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`);
    }

    const data: any = await response.json();
    
    let apiPlayers: any[] = [];
    if (Array.isArray(data)) {
      apiPlayers = data;
    } else if (data && Array.isArray(data.allPlayers)) {
      apiPlayers = data.allPlayers;
    } else if (data && Array.isArray(data.players)) {
      apiPlayers = data.players;
    } else if (data && Array.isArray(data.results)) {
      apiPlayers = data.results;
    } else if (data && typeof data === 'object') {
      const arrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
      if (arrayKey) {
        apiPlayers = data[arrayKey];
      }
    }

    if (apiPlayers.length === 0) {
      return res.json({ players: matchedMocks });
    }

    const mappedPlayers = apiPlayers.map((p: any, index: number) => {
      const id = p.id || p.playerId || `live-${index}-${Date.now()}`;
      const name = p.name || p.fullName || p.player_name || 'Unknown Player';
      const rawPos = p.position || p.pos || p.player_position || 'MID';
      const position = mapPosition(rawPos);
      const club = p.team || p.club || p.clubName || p.team_name || 'Unknown Club';
      const nationality = p.country || p.nationality || p.player_country || 'Unknown Nation';
      return { id, name, position, club, nationality };
    });

    res.json({ players: mappedPlayers });
  } catch (err: any) {
    console.error('RapidAPI Fetch error, falling back to mock:', err);
    res.json({ players: matchedMocks });
  }
});

app.post('/api/enrich-player', apiSecurityMiddleware, async (req, res) => {
  const { name, club, nationality, position } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Player name is required.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    const stats = generateDefaultStats(position);
    return res.json({
      id: 'live-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name,
      position: position || 'MID',
      rating: 83,
      price: 0,
      stats,
      nationality: nationality || 'Unknown',
      club: club || 'Unknown',
      playstyles: getPositionalPlaystyles(position),
      recentForm: [7.2, 6.8, 8.1, 7.5, 7.9]
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      You are an elite StatsBomb data scientist and professional soccer analyst.
      Analyze the player's real-world tactical profile and performance over the past season and output precise statistics.
      Name: ${name}
      Club: ${club || 'Unknown'}
      Nationality: ${nationality || 'Unknown'}
      Position: ${position || 'MID'}

      Respond STRICTLY with a single JSON object. No Markdown code fences, no extra text.
      The JSON must strictly match this exact TypeScript interface:
      {
        "rating": number, // Overall rating from 70 to 95 reflecting real-world level
        "stats": {
          "goals": number, // typical goals per season
          "assists": number, // typical assists per season
          "passAccuracy": number, // 0-100 passing accuracy percentage
          "defense": number, // 0-100 defending score (for GK, this is reflexes/saving)
          "physicality": number, // 0-100 physical score
          "stamina": number, // 0-100 stamina score
          "pace": number, // 0-100 pace score
          "dribbling": number, // 0-100 dribbling score
          "xG90": number, // expected goals per 90 mins (float e.g., 0.15)
          "xA90": number // expected assists per 90 mins (float e.g., 0.22)
        },
        "playstyles": string[], // Choose 2 to 4 appropriate styles from: ['Target Man', 'Infiltrator', 'Agile Turn', 'Finesse Shot', 'Box-to-Box', 'Double Pivot', 'Midfield Anchor', 'Interception King', 'Pass Master', 'Dribble Wizard', 'Sprint Machine', 'Wing Back', 'Jockey Expert', 'Aerial Commander', 'Block Master', 'Sweeper Keeper']
        "recentForm": number[] // last 5 actual/realistic match ratings (e.g., [7.5, 8.2, 6.9, 7.8, 8.1])
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    let rawText = (response.text || '').trim();
    rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/g, '').trim();

    const data = JSON.parse(rawText);

    return res.json({
      id: 'live-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name,
      position: position || 'MID',
      rating: data.rating || 82,
      price: 0, // Computed dynamically on React side
      stats: data.stats || generateDefaultStats(position),
      nationality: nationality || 'Unknown',
      club: club || 'Unknown',
      playstyles: data.playstyles || getPositionalPlaystyles(position),
      recentForm: data.recentForm || [7.2, 7.2, 7.2, 7.2, 7.2]
    });

  } catch (err: any) {
    console.error('Gemini player enrichment error, using baseline fallback:', err);
    const stats = generateDefaultStats(position);
    return res.json({
      id: 'live-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name,
      position: position || 'MID',
      rating: 81,
      price: 0,
      stats,
      nationality: nationality || 'Unknown',
      club: club || 'Unknown',
      playstyles: getPositionalPlaystyles(position),
      recentForm: [7.0, 7.2, 6.8, 7.5, 7.1]
    });
  }
});

async function setupExpress() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port http://0.0.0.0:${PORT}`);
  });
}

setupExpress();
