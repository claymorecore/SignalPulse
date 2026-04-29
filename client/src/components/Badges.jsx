import { memo, useMemo } from "react";

const formatCount = (value, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;

const formatStatus = (status) => {
  const s = String(status || "").trim().toLowerCase();

  if (!s) {
    return { label: "–", className: "" };
  }

  if (["running", "started", "scanning"].includes(s)) {
    return { label: "running", className: "good" };
  }

  if (s === "stopped") {
    return { label: "stopped", className: "bad" };
  }

  if (s === "idle") {
    return { label: "idle", className: "" };
  }

  return { label: s, className: "" };
};

const Badges = memo(function Badges({
  status,
  session,
  universeCount,
  signalsCount
}) {
  const statusMeta = useMemo(() => formatStatus(status), [status]);

  const safeSignalsCount = formatCount(signalsCount);
  const safeUniverseCount = formatCount(universeCount);

  const badgeData = useMemo(
    () => [
      {
        label: "session",
        value: session ?? "–"
      },
      {
        label: "signals",
        value: safeSignalsCount,
        className: safeSignalsCount > 0 ? "good" : ""
      },
      {
        label: "universe",
        value: safeUniverseCount
      },
      {
        label: "status",
        value: statusMeta.label,
        className: `strong push-end ${statusMeta.className || ""}`.trim()
      }
    ],
    [statusMeta, session, safeSignalsCount, safeUniverseCount]
  );

  return (
    <div className="badges">
      {badgeData.map((item) => (
        <span
          key={item.label}
          className={`badge${item.className ? ` ${item.className}` : ""}`}
          title={`${item.label}: ${item.value}`}
        >
          {item.label}: {item.value}
        </span>
      ))}
    </div>
  );
});

export default Badges;