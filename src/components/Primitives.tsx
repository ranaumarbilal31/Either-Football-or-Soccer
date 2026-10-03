import React, { useEffect, useRef } from "react";
import { X, ArrowUpRight, UserRound } from "lucide-react";
import { Player } from "../domain/model";

export function PageHeading({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children && <p className="lede">{children}</p>}
      </div>
      {action}
    </header>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-mark">
        <ArrowUpRight size={30} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Avatar({
  player,
  large = false,
}: {
  player: Player;
  large?: boolean;
}) {
  return (
    <div className={`avatar ${large ? "large" : ""}`}>
      <span>
        {player.name
          .split(/\s+/)
          .slice(0, 2)
          .map((s) => s[0])
          .join("")}
      </span>
      {player.image && (
        <img
          src={player.image}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.hidden = true;
          }}
        />
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const element = ref.current!;
    const before = document.activeElement as HTMLElement;
    const previous = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previous;
      before?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        close.current();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close.current();
      }}
    >
      <div className="modal-content">
        <header className="modal-header">
          <span>{title}</span>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close details"
          >
            <X />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
export function PlayerCard({
  player,
  selected,
  disabled,
  onDetails,
  onDraft,
}: {
  player: Player;
  selected: boolean;
  disabled: string | null;
  onDetails: () => void;
  onDraft: () => void;
}) {
  const keys =
    player.role === "GK"
      ? (["keeping", "passing", "stamina"] as const)
      : player.role === "DEF"
        ? (["defense", "passing", "pace"] as const)
        : (["attack", "passing", "pace"] as const);
  return (
    <article
      className={`player-card role-${player.role || "unknown"} ${selected ? "is-selected" : ""}`}
    >
      <div className="card-top">
        <span className="position-badge">{player.role || "N/A"}</span>
        <span className="card-rating">
          {player.game.overall}
          <small>OVR</small>
        </span>
      </div>
      <button
        className="player-identity"
        onClick={onDetails}
        aria-label={`View ${player.name}`}
      >
        <Avatar player={player} />
        <div>
          <h3>{player.name}</h3>
          <p>{player.club || "Club unavailable"}</p>
        </div>
      </button>
      <div className="card-metrics">
        {keys.map((k) => (
          <div key={k}>
            <span>{k}</span>
            <strong>{player.game.attributes[k]}</strong>
          </div>
        ))}
      </div>
      <div className="card-footer">
        <div>
          <strong>{player.game.cost}</strong>
          <span> credits</span>
        </div>
        <button
          className="button small"
          disabled={selected || !!disabled}
          title={disabled || undefined}
          onClick={onDraft}
        >
          {selected
            ? "In squad"
            : disabled === "Over budget"
              ? "Over budget"
              : disabled
                ? "Unavailable"
                : "Sign player"}
          {!selected && !disabled && <ArrowUpRight size={15} />}
        </button>
      </div>
      <div className="card-footnote">
        {player.provider === "legacy"
          ? "Legacy save · refresh needed"
          : "Estimated game attributes"}
      </div>
    </article>
  );
}
