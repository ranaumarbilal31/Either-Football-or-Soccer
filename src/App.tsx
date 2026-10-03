import {
  Component,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import {
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  Users,
  Search,
  Trophy,
  ChartNoAxesCombined,
  X,
  ArrowUpRight,
} from "lucide-react";
import { useGame, activeSquad } from "./state/store";
import { fetchPlayer } from "./data/api";
import SquadPage from "./pages/SquadPage";
import PlayersPage, { playerDestination } from "./pages/PlayersPage";
import MatchPage from "./pages/MatchPage";
import InsightsPage from "./pages/InsightsPage";

const scrolls = new Map<string, number>();
function ScrollMemory() {
  const location = useLocation();
  useLayoutEffect(() => {
    const key = location.pathname + location.search;
    const frame = requestAnimationFrame(() =>
      window.scrollTo({ top: scrolls.get(key) || 0, behavior: "instant" }),
    );
    return () => {
      cancelAnimationFrame(frame);
      scrolls.set(key, window.scrollY);
    };
  }, [location.pathname, location.search]);
  return null;
}
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="fatal">
        <h1>Let's regroup.</h1>
        <p>
          The console encountered an unexpected problem. Your saved data has not
          been deleted.
        </p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload console
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  const game = useGame();
  const location = useLocation();
  const refreshed = useRef(false);
  useEffect(() => {
    void game.hydrate();
  }, [game.hydrate]);
  useEffect(() => {
    if (!game.ready || refreshed.current) return;
    refreshed.current = true;
    let cancelled = false;
    const ids = new Set(
      game.save.squads.flatMap((s) => s.members.map((m) => m.playerId)),
    );
    const stale = game.save.players
      .filter(
        (p) =>
          ids.has(p.id) &&
          p.provider === "sportsdb" &&
          Date.now() - Date.parse(p.fetchedAt) > 86_400_000,
      )
      .slice(0, 11);
    void (async () => {
      for (const p of stale) {
        if (cancelled) return;
        try {
          const player = await fetchPlayer(p.id);
          if (!cancelled) useGame.getState().remember([player]);
        } catch {
          break;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [game.ready]);
  useEffect(() => {
    if (!game.message) return;
    const id = setTimeout(() => game.notify(""), 7000);
    return () => clearTimeout(id);
  }, [game.message, game.notify]);
  if (!game.ready)
    return (
      <div className="loading-club">
        <img src="/logo.webp" alt="" />
        <h1>Opening your club.</h1>
        <p>Getting the touchline ready…</p>
      </div>
    );
  const squad = activeSquad(game.save);
  const links = [
    { to: "/squad", label: "Squad", icon: Users },
    { to: playerDestination(), label: "Players", icon: Search },
    { to: "/match", label: "Match", icon: Trophy },
    { to: "/insights", label: "Insights", icon: ChartNoAxesCombined },
  ];
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <NavLink to="/squad" className="brand">
          <img src="/logo.webp" alt="Either Football or Soccer logo" />
          <span>
            Either Football
            <br />
            <em>or Soccer</em>
          </span>
        </NavLink>
        <div className="sidebar-label">THE FOOTBALL CONSOLE</div>
        <nav aria-label="Main navigation">
          {links.map(({ to, label, icon: Icon }, i) => (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
              <small>0{i + 1}</small>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="edition">YOUR CLUB. YOUR CALL.</span>
          <p>
            A game of eleven.
            <br />A world of possibilities.
          </p>
          <div className="sidebar-ball">✳</div>
          <small>EFOS / VOL. 02</small>
        </div>
      </aside>
      <div className="app-shell">
        <header className="topbar">
          <NavLink to="/squad" className="mobile-brand">
            <img src="/logo.webp" alt="" />
            <span>
              Either Football
              <br />
              <em>or Soccer</em>
            </span>
          </NavLink>
          <span className="desktop-label">
            THE TOUCHLINE <span>/</span>{" "}
            {location.pathname.slice(1).toUpperCase() || "SQUAD"}
          </span>
          <div className="club-chip">
            <span className="club-monogram">XI</span>
            <span>
              {squad.name}
              <small>
                {game.conflict
                  ? "Save needs attention"
                  : "Local club · free to play"}
              </small>
            </span>
          </div>
        </header>
        {game.conflict && (
          <div className="storage-banner" role="alert">
            {game.saveStatus}. Open Squad → My clubs → Export save to keep your
            work.
          </div>
        )}
        <main id="main" tabIndex={-1}>
          <ScrollMemory />
          <Routes>
            <Route path="/squad" element={<SquadPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/match" element={<MatchPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="*" element={<Navigate to="/squad" replace />} />
          </Routes>
          <footer className="site-footer">
            <span>EITHER FOOTBALL OR SOCCER</span>
            <span>
              Built for the love of the game. <ArrowUpRight size={14} />
            </span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={label}
            to={to}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      {game.message && (
        <div className="toast" role="status">
          <span>{game.message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => game.notify("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
    </>
  );
}
