import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Star,
  RefreshCw,
  GitCompareArrows,
} from "lucide-react";
import { fetchPlayer, fetchPlayers } from "../data/api";
import { Player, Roles, slots, slotId } from "../domain/model";
import { spent } from "../domain/squad";
import { activeSquad, useGame } from "../state/store";
import {
  Avatar,
  Empty,
  Modal,
  PageHeading,
  PlayerCard,
} from "../components/Primitives";

let rememberedSearch = "";
export function playerDestination() {
  return `/players${rememberedSearch}`;
}
export default function PlayersPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const game = useGame();
  const squad = activeSquad(game.save);
  const query = params.get("q") || "";
  const role = Roles.includes(params.get("role") as (typeof Roles)[number])
    ? params.get("role")!
    : "ALL";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const sort = params.get("sort") || "name";
  const library = params.get("view") || "discover";
  const slotRaw = params.get("slot");
  const targetSlot =
    slotRaw !== null && /^\d+$/.test(slotRaw) && Number(slotRaw) < 11
      ? Number(slotRaw)
      : undefined;
  const [input, setInput] = useState(query);
  const [selected, setSelected] = useState<Player | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => {
    setInput(query);
    const copy = new URLSearchParams(params);
    copy.delete("slot");
    rememberedSearch = copy.size ? `?${copy}` : "";
  }, [params, query]);
  const data = useQuery({
    queryKey: ["players", query, role, sort, page],
    queryFn: ({ signal }) => fetchPlayers(query, role, sort, page, signal),
    enabled: library === "discover",
    staleTime: 300_000,
    retry: false,
  });
  useEffect(() => {
    if (data.data) game.remember(data.data.players);
  }, [data.data, game.remember]);
  const local = game.save.players
    .filter(
      (p) =>
        (library !== "shortlist" || game.save.shortlist.includes(p.id)) &&
        (role === "ALL" || p.role === role) &&
        `${p.name} ${p.club || ""}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "cost"
        ? a.game.cost - b.game.cost
        : sort === "rating"
          ? b.game.overall - a.game.overall
          : a.name.localeCompare(b.name),
    );
  const localPage = Math.min(page, Math.max(1, Math.ceil(local.length / 20)));
  const result =
    library === "discover"
      ? data.data
      : {
          players: local.slice((localPage - 1) * 20, localPage * 20),
          total: local.length,
          pages: Math.max(1, Math.ceil(local.length / 20)),
          page: localPage,
          stale: false,
          source: "Your library",
          message:
            "Previously discovered profiles. Club information may have changed since it was fetched.",
        };
  const change = (updates: Record<string, string>) => {
    const next = new URLSearchParams(params);
    next.set("page", "1");
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next);
    window.scrollTo({ top: 0 });
  };
  const sign = (p: Player) => {
    if (game.draft(p, targetSlot)) {
      game.notify(`${p.name} signed.`);
      if (targetSlot !== undefined) navigate("/squad");
    }
  };
  const unavailable = (p: Player) => {
    if (!p.role) return "Position unavailable";
    if (targetSlot !== undefined && (p.role === "GK") !== (targetSlot === 0))
      return "Position unavailable";
    const old = squad.members.find((m) => m.slot === slotId(targetSlot ?? -1));
    if (spent(squad) - (old?.paid || 0) + p.game.cost > squad.budget)
      return "Over budget";
    return null;
  };
  const toggleShortlist = (id: string) =>
    game.commit((s) => {
      s.shortlist = s.shortlist.includes(id)
        ? s.shortlist.filter((v) => v !== id)
        : [...s.shortlist, id];
    });
  const details = selected
    ? game.save.players.find((p) => p.id === selected.id) || selected
    : null;
  const refresh = async (p: Player) => {
    if (p.provider === "legacy") {
      setSelected(null);
      change({ q: p.name, view: "discover", role: "ALL" });
      return;
    }
    setRefreshing(true);
    try {
      const player = await fetchPlayer(p.id);
      game.remember([player]);
      setSelected(player);
      game.notify("Profile checked with the provider.");
    } catch (error) {
      game.notify(
        error instanceof Error
          ? error.message
          : "Could not refresh this profile.",
      );
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <>
      <PageHeading eyebrow="THE TRANSFER ROOM" title="Find your eleven.">
        Real names. Your game plan. A new possibility in every position.
      </PageHeading>
      {targetSlot !== undefined && (
        <div className="selection-banner">
          <span>
            Choosing {slots(squad.formation)[targetSlot]} · position{" "}
            {targetSlot + 1}
          </span>
          <button className="text-button" onClick={() => navigate("/squad")}>
            <ArrowLeft size={16} /> Back to squad
          </button>
        </div>
      )}
      <section className="player-controls">
        <form
          className="search-form"
          onSubmit={(e) => {
            e.preventDefault();
            change({ q: input.trim() });
          }}
        >
          <Search size={19} />
          <input
            aria-label="Search players"
            placeholder={
              library === "discover"
                ? "Search a real player by name…"
                : "Search your discovered players…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={100}
          />
          <button className="button primary" type="submit">
            Search
          </button>
        </form>
        <div className="filter-row">
          <div className="segmented roles" aria-label="Position filter">
            {["ALL", ...Roles].map((r) => (
              <button
                key={r}
                aria-pressed={role === r}
                onClick={() => change({ role: r })}
              >
                {r === "ALL" ? "All roles" : r}
              </button>
            ))}
          </div>
          <select
            aria-label="Player collection"
            value={library}
            onChange={(e) => change({ view: e.target.value })}
          >
            <option value="discover">Discover</option>
            <option value="library">My discovered players</option>
            <option value="shortlist">Shortlist</option>
          </select>
          <select
            aria-label="Sort players"
            value={sort}
            onChange={(e) => change({ sort: e.target.value })}
          >
            <option value="name">Name A–Z</option>
            <option value="rating">Highest OVR</option>
            <option value="cost">Lowest cost</option>
          </select>
        </div>
      </section>
      <div className="results-heading">
        <span>
          {result
            ? `${result.total} players · ${result.source}`
            : "Finding players…"}
        </span>
        <span>{squad.budget - spent(squad)} credits available</span>
      </div>
      {result?.message && (
        <p className="data-note">
          {result.stale ? "Cached data · refresh currently unavailable. " : ""}
          {result.message}
        </p>
      )}
      {library === "discover" && data.isPending && (
        <div className="card-grid" aria-label="Loading players">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton-card">
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      )}
      {library === "discover" && data.isError && (
        <Empty
          title="The scouting desk is offline."
          action={
            <div className="button-row">
              <button className="button primary" onClick={() => data.refetch()}>
                Try again
              </button>
              <button
                className="button"
                onClick={() => change({ view: "library" })}
              >
                Use discovered players
              </button>
            </div>
          }
        >
          {data.error.message} Saved squads still work.
        </Empty>
      )}
      {result && (
        <>
          <div className="card-grid">
            {result.players.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                selected={squad.members.some((m) => m.playerId === p.id)}
                disabled={unavailable(p)}
                onDraft={() => sign(p)}
                onDetails={() => setSelected(p)}
              />
            ))}
          </div>
          {!result.players.length && (
            <Empty
              title="No players on this list yet."
              action={
                <button
                  className="button"
                  onClick={() => {
                    setInput("");
                    change({ q: "", role: "ALL", view: "discover" });
                  }}
                >
                  Explore discovery sample
                </button>
              }
            >
              {library === "shortlist"
                ? "Open a player profile and add them to your shortlist."
                : "Try another full player name or clear the position filter. Free provider coverage is limited."}
            </Empty>
          )}
          <div className="pagination">
            <button
              className="button"
              disabled={result.page <= 1}
              onClick={() => change({ page: String(result.page - 1) })}
            >
              <ArrowLeft size={16} /> Previous
            </button>
            <span>
              Page {result.page} of {result.pages}
            </span>
            <button
              className="button"
              disabled={result.page >= result.pages}
              onClick={() => change({ page: String(result.page + 1) })}
            >
              Next <ArrowRight size={16} />
            </button>
          </div>
        </>
      )}
      {compare.length > 0 && (
        <div className="compare-bar">
          <span>{compare.length}/2 selected for comparison</span>
          <button className="button" onClick={() => setCompare([])}>
            Clear
          </button>
          <button
            className="button primary"
            disabled={compare.length !== 2}
            onClick={() => setComparing(true)}
          >
            Compare players
          </button>
        </div>
      )}
      {details && (
        <Modal title="Player profile" onClose={() => setSelected(null)}>
          <div className="profile-hero">
            <Avatar player={details} large />
            <div>
              <span className={`position-badge role-${details.role}`}>
                {details.role || "Position unavailable"}
              </span>
              <h2>{details.name}</h2>
              <p>
                {details.club || "Club unavailable"} ·{" "}
                {details.nationality || "Nationality unavailable"}
              </p>
            </div>
          </div>
          <div className="profile-body">
            <div className="profile-numbers">
              <div>
                <strong>{details.game.overall}</strong>
                <span>Estimated OVR</span>
              </div>
              <div>
                <strong>{details.game.cost}</strong>
                <span>Game credits</span>
              </div>
            </div>
            <h3>Game attributes</h3>
            <div className="attribute-list">
              {Object.entries(details.game.attributes).map(([key, value]) => (
                <div key={key}>
                  <span>{key}</span>
                  <div className="progress">
                    <span style={{ width: `${value}%` }} />
                  </div>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <p className="data-note">
              {details.game.basis === "baseline"
                ? "Positional baseline estimates. This provider supplies profiles, not enough performance statistics to distinguish player ability."
                : details.game.basis === "legacy"
                  ? "Recovered from an older save. Search for a current provider profile to replace this record."
                  : "Calculated from available statistics."}
            </p>
            <h3>Profile source</h3>
            <p>
              {details.provider === "sportsdb"
                ? "TheSportsDB"
                : details.provider === "rapidapi"
                  ? "RapidAPI"
                  : "Legacy save"}{" "}
              ·{" "}
              {details.provider === "legacy"
                ? "Not verified"
                : `Fetched ${new Date(details.fetchedAt).toLocaleDateString()}`}
            </p>
            <p className="data-note">
              Fetched time is not a guarantee of when the provider last updated
              the club.
            </p>
            <div className="button-row">
              <button
                className="button"
                onClick={() => toggleShortlist(details.id)}
              >
                <Star size={17} />
                {game.save.shortlist.includes(details.id)
                  ? "Remove from shortlist"
                  : "Shortlist"}
              </button>
              <button
                className="button"
                onClick={() => {
                  setCompare((c) =>
                    c.includes(details.id)
                      ? c.filter((id) => id !== details.id)
                      : [...c.slice(-1), details.id],
                  );
                  setSelected(null);
                }}
              >
                <GitCompareArrows size={17} /> Compare
              </button>
              <button
                className="button"
                disabled={refreshing}
                onClick={() => refresh(details)}
              >
                <RefreshCw size={16} />
                {refreshing
                  ? "Checking…"
                  : details.provider === "legacy"
                    ? "Find current profile"
                    : "Refresh profile"}
              </button>
            </div>
            <button
              className="button primary full"
              disabled={
                squad.members.some((m) => m.playerId === details.id) ||
                !!unavailable(details)
              }
              onClick={() => {
                sign(details);
                setSelected(null);
              }}
            >
              Sign player · {details.game.cost} credits
            </button>
          </div>
        </Modal>
      )}
      {comparing && (
        <Modal title="Player comparison" onClose={() => setComparing(false)}>
          <div className="profile-body">
            <div className="comparison">
              {compare.map((id) => {
                const p = game.save.players.find((p) => p.id === id);
                return (
                  p && (
                    <section key={id}>
                      <Avatar player={p} />
                      <h3>{p.name}</h3>
                      <p>{p.club || "Unavailable"}</p>
                      <strong>
                        {p.game.overall} OVR · {p.game.cost} cr
                      </strong>
                      {Object.entries(p.game.attributes).map(([key, value]) => (
                        <div className="comparison-stat" key={key}>
                          <span>{key}</span>
                          <strong>{value}</strong>
                        </div>
                      ))}
                    </section>
                  )
                );
              })}
            </div>
            <p className="data-note">All ratings shown are game estimates.</p>
          </div>
        </Modal>
      )}
    </>
  );
}
