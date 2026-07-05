# ⚽ Either Football or Soccer

**An AI-powered football squad builder and match simulation platform featuring real-time live player scouting, Gemini predictive attribute modeling, and regression-based market valuation.**

**Live Application:** [https://either-football-or-soccer.onrender.com](https://either-football-or-soccer.onrender.com)  
**Owner:** [ranaumarbilal31](https://github.com/ranaumarbilal31)  
**Collaborator:** [zaid-mian](https://github.com/zaid-mian)  

---

## 📑 Table of Contents
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Architecture Highlights](#-architecture-highlights)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**"Either Football or Soccer"** bridges the gap between traditional fantasy football and deep tactical management. Build your dream squad using real-time player data, construct intricate tactical setups, and simulate matches with a custom chemistry and positional coherence engine. 

After the whistle blows, get a world-class, AI-generated tactical debrief powered by Google's Gemini to refine your strategy. Whether you call it football or soccer, the tactical depth here is undeniable.

## ✨ Key Features

* **AI Tactical Debriefs:** Integrates with the Gemini API to generate professional, dressing-room style post-match reports. The AI analyzes your specific tactical sliders, expected goals (xG), and player stamina to tell you exactly what went right or wrong.
* **Live Player Scouting:** Search for real-world players via RapidAPI's Live Football Data to build your ultimate starting XI.
* **Predictive Attribute Modeling:** Uses AI to enrich player data, dynamically generating accurate attributes (Pace, Dribbling, Passing, Defense, xG90) and assigning playstyles based on real-world form.
* **Deep Tactical Engine:**
  * **Squad Chemistry:** Advanced calculations rewarding club/national links while heavily penalizing out-of-position deployments.
  * **Positional Coherence:** A sophisticated matrix that degrades player performance if played out of their native sub-role (e.g., playing a Target Man as a False Nine, or a Fullback at Center Back).
  * **Match Simulation:** Calculates SHAP values for individual player impacts based on pressing intensity, defensive lines, and tempo to determine the final scoreline.
* **Modern UI/UX:** Built with React 19, Tailwind CSS v4, and Framer Motion for a fluid, dark-mode, high-tech tactical dashboard aesthetic.
* **Graceful Fallbacks:** Fully functional offline mode. If API keys are missing or quotas are hit, the app seamlessly falls back to a robust local simulation and mock database engine.

## 🛠️ Tech Stack

**Frontend:**
* React 19
* TypeScript
* Vite 6
* Tailwind CSS v4
* Framer Motion (`motion/react`)
* Lucide React (Icons)

**Backend:**
* Node.js & Express
* RapidAPI integration (Live Football Data)

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+ recommended)
* npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ranaumarbilal31/either-football-or-soccer.git
   cd either-football-or-soccer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add the following keys. *(You can copy from `.env.example` if available).*

   ```env
   # Required for Gemini AI post-match debriefs and player stat enrichment
   GEMINI_API_KEY="your_gemini_api_key_here"

   # Required for real-time live soccer players lookup
   RAPIDAPI_KEY="your_rapidapi_key_here"
   RAPIDAPI_HOST="free-api-live-football-data.p.rapidapi.com"
   ```

   > **Note:** The app will run without these keys using a built-in local fallback engine.

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

### Building for Production

To create an optimized production build and run it locally:

```bash
npm run build
npm start
```

---

## 📂 Architecture Highlights

* **`server.ts`**: The Express backend handling API routing, security middleware (`x-app-secret`), Gemini prompt generation, and RapidAPI fetching.
* **`src/utils/chemistry.ts` & `positionalCoherence.ts`**: The core mathematical engines determining how well your squad plays together based on positioning and relationships.
* **`src/utils/simulation.ts`**: The match engine that computes final scores, possession stats, and individual player ratings based on tactical sliders (Tempo, Defensive Line, Pressing).
* **`src/components/`**: Modular React components separating the Draft phase (`SquadPitch`), Live Analysis (`LiveAnalyticsHub`), and Post-Match (`DebriefRoom`).

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/ranaumarbilal31/either-football-or-soccer/issues) if you want to contribute.

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
