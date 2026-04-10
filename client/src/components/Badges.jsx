import React, { memo, useMemo } from "react";

const formatCount = (value, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;

const Badges = memo(function Badges({
  status,
  session,
  universeCount,
  signalsCount
}) {
  const badgeData = useMemo(() => [
    { label: "session", value: session || "–" },
    { label: "status", value: status || "–", className: "strong" },
    { label: "universe", value: formatCount(universeCount) },
    { label: "signals", value: formatCount(signalsCount), className: "push-end" }
  ], [status, session, universeCount, signalsCount]);

  return (
    <div className="badges">
      {badgeData.map(({ label, value, className }) => {
        return (
          <span
            key={label}
            className={`badge${className ? ` ${className}` : ""}`}
            title={`${label}: ${value}`}
          >
            {label}: {value}
          </span>
        );
      })}
    </div>
  );
});

export default Badges;
