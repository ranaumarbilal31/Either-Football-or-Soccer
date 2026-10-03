import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useGame } from "../state/store";
import { Empty, PageHeading } from "../components/Primitives";
import ValueChart from "../components/ValueChart";
export default function InsightsPage() {
  const save = useGame((s) => s.save);
  const [params, setParams] = useSearchParams();
  const match =
    save.matches.find((m) => m.id === params.get("match")) || save.matches[0];
  return (
    <>
      <PageHeading
        eyebrow="THE FINAL WHISTLE IS JUST THE START"
        title="Read the game."
      >
        Find the small changes that make a better eleven.
      </PageHeading>
      {match ? (
        <>
          <div className="report-header">
            <div>
              <span className="eyebrow">
                MATCH REPORT · {new Date(match.playedAt).toLocaleDateString()}
              </span>
              <h2>
                {match.homeName}{" "}
                <span className="orange">
                  {match.home.goals} — {match.away.goals}
                </span>{" "}
                {match.awayName}
              </h2>
            </div>
            <Link className="button" to="/squad">
              Back to the board <ArrowRight size={16} />
            </Link>
          </div>
          <div className="two-columns">
            <section className="panel">
              <p className="eyebrow">THE MATCH IN NUMBERS</p>
              <h2>Beyond the score.</h2>
              {(
                [
                  { key: "possession", label: "Possession", suffix: "%" },
                  { key: "shots", label: "Shots", suffix: "" },
                  { key: "onTarget", label: "On target", suffix: "" },
                  { key: "xg", label: "Expected goals", suffix: "" },
                  { key: "completed", label: "Completed passes", suffix: "" },
                ] as const
              ).map(({ key, label, suffix }) => (
                <div className="match-stat" key={key}>
                  <div>
                    <strong>
                      {match.home[key]}
                      {suffix}
                    </strong>
                    <span>{label}</span>
                    <strong>
                      {match.away[key]}
                      {suffix}
                    </strong>
                  </div>
                  <div className="duel-bar">
                    <span
                      style={{
                        width: `${(match.home[key] / Math.max(1, match.home[key] + match.away[key])) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </section>
            <section className="panel coaching">
              <p className="eyebrow">YOUR NEXT MOVE</p>
              <h2>From the dugout.</h2>
              {match.advice.map((advice, i) => (
                <div className="coach-note" key={i}>
                  <span>0{i + 1}</span>
                  <p>{advice}</p>
                </div>
              ))}
              <p className="data-note">
                Local tactical analysis · simulation engine {match.engine}
              </p>
            </section>
          </div>
          <section className="panel ratings-panel">
            <p className="eyebrow">INDIVIDUAL PERFORMANCES</p>
            <h2>The starting eleven.</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Rating</th>
                    <th>Goals</th>
                    <th>Passing</th>
                    <th>Energy</th>
                  </tr>
                </thead>
                <tbody>
                  {match.ratings.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>
                        <span className="rating-pill">
                          {r.rating.toFixed(1)}
                        </span>
                      </td>
                      <td>{r.goals}</td>
                      <td>
                        {r.completed}/{r.passes}
                      </td>
                      <td>{r.stamina}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <Empty
          title="Your story starts at kickoff."
          action={
            <Link className="button primary" to="/match">
              Go to match centre <ArrowRight size={16} />
            </Link>
          }
        >
          Build a full XI and play a match to unlock your report.
        </Empty>
      )}
      <div className="two-columns insights-bottom">
        <ValueChart players={save.players} />
        <section className="panel">
          <p className="eyebrow">THE FORM BOOK</p>
          <h2>Recent matches.</h2>
          {save.matches.length ? (
            save.matches.map((m) => (
              <button
                key={m.id}
                className={`history-row ${match?.id === m.id ? "selected" : ""}`}
                onClick={() => {
                  setParams({ match: m.id });
                  window.scrollTo({ top: 0 });
                }}
              >
                <span>
                  <strong>{m.awayName}</strong>
                  <small>
                    {new Date(m.playedAt).toLocaleDateString()} · {m.homeName}
                  </small>
                </span>
                <b>
                  {m.home.goals}–{m.away.goals}
                </b>
              </button>
            ))
          ) : (
            <p>
              Completed matches will appear here. The latest 50 are saved on
              this device.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
