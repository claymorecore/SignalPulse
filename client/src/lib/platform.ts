const orderByOpenThenRecent = (left, right) => {
  const leftOpen = ["OPEN", "ACTIVE"].includes(String(left?.status || "").toUpperCase()) ? 1 : 0;
  const rightOpen = ["OPEN", "ACTIVE"].includes(String(right?.status || "").toUpperCase()) ? 1 : 0;

  if (leftOpen !== rightOpen) return rightOpen - leftOpen;
  return Number(right?.createdAt || 0) - Number(left?.createdAt || 0);
};

const groupCount = (signals, getter) =>
  signals.reduce((accumulator, signal) => {
    const key = getter(signal);
    accumulator.set(key, (accumulator.get(key) || 0) + 1);
    return accumulator;
  }, new Map());

const toRows = (map, helperBuilder) =>
  Array.from(map.entries()).map(([label, value]) => ({
    key: label,
    label,
    value,
    helper: helperBuilder(label, value)
  }));

const buildRegime = ({ isRunning, openSignals, liveCount, universeCount }) => {
  if (!isRunning && openSignals === 0) {
    return {
      label: "Observation mode",
      helper: "No active session is producing fresh setups right now."
    };
  }

  if (openSignals >= 6 || liveCount >= 4) {
    return {
      label: "Expansion",
      helper: "Opportunity flow is broad enough to require tighter prioritization."
    };
  }

  if (openSignals >= 2 || universeCount >= 20) {
    return {
      label: "Selective trend",
      helper: "Signals exist, but context discipline still matters more than activity."
    };
  }

  return {
    label: "Caution",
    helper: "Low participation suggests waiting for cleaner structure."
  };
};

const buildContextBoard = ({ regime, openSignals, strategies, timeframes }) => [
  `Regime focus: ${regime.label}. ${regime.helper}`,
  openSignals
    ? `${openSignals} open structures are active. Prioritize validation before broadening exposure.`
    : "No live structures are open. Stay in awareness mode and wait for confirmation.",
  strategies.length
    ? `Scanner strategy coverage: ${strategies.join(", ")}.`
    : "No strategy metadata is available yet.",
  timeframes.length
    ? `Current timeframes in play: ${timeframes.join(", ")}.`
    : "No timeframe concentration is available until valid signals appear."
];

export const scannerPresets = [
  {
    key: "balanced",
    label: "Balanced",
    config: {
      universe: { size: 40 },
      scan: { batch: 8, throttleMs: 140, backfill: 180, symbolCooldownMs: 6500 },
      timeframe: { frames: ["1m", "5m"], tick1mSec: 45, tick5mSec: 120 }
    }
  },
  {
    key: "focused",
    label: "Focused",
    config: {
      universe: { size: 24 },
      scan: { batch: 6, throttleMs: 160, backfill: 220, symbolCooldownMs: 8000 },
      timeframe: { frames: ["5m"], tick5mSec: 120 }
    }
  },
  {
    key: "fast",
    label: "Fast",
    config: {
      universe: { size: 16 },
      scan: { batch: 10, throttleMs: 100, backfill: 120, symbolCooldownMs: 5000 },
      timeframe: { frames: ["1m"], tick1mSec: 30 }
    }
  }
];

export const createPlatformModel = ({ snapshot, scannerStatus, strategies }) => {
  const signals = [...(snapshot.signals || [])].sort(orderByOpenThenRecent);
  const openSignals = signals.filter((signal) => ["OPEN", "ACTIVE"].includes(String(signal.status || "").toUpperCase()));
  const timeframes = Array.from(new Set(signals.map((signal) => signal.tf).filter(Boolean)));
  const strategyNames = (strategies || []).map((strategy) => strategy?.key || strategy?.name).filter(Boolean);
  const isRunning = Boolean(scannerStatus?.running) || String(snapshot.status || "").toLowerCase() === "running";
  const regime = buildRegime({
    isRunning,
    openSignals: openSignals.length,
    liveCount: Number(snapshot.liveCount) || 0,
    universeCount: Number(snapshot.universeCount) || 0
  });
  const sideCounts = groupCount(openSignals, (signal) => String(signal.side || "N/A").toUpperCase());
  const timeframeCounts = groupCount(openSignals, (signal) => signal.tf || "N/A");
  const closedSignals = signals.filter((signal) => !openSignals.includes(signal));
  const watchRows = [...openSignals, ...closedSignals].slice(0, 6).map((signal) => ({
    key: signal.key,
    symbol: signal.symbol || "N/A",
    side: signal.side || "N/A",
    status: signal.status || "N/A",
    pnlPct: Number.isFinite(signal.pnlPct) ? `${signal.pnlPct.toFixed(2)}%` : "N/A"
  }));

  const primarySignal = openSignals[0] || signals[0] || null;
  const contextScore = `${Math.max(1, Math.min(10, openSignals.length + (isRunning ? 2 : 0)))}/10`;
  const executionReadiness = openSignals.length ? `${Math.min(100, 40 + openSignals.length * 10)}%` : "34%";

  return {
    signals,
    filters: { timeframes },
    metrics: {
      openSignals: openSignals.length,
      universeCount: Number(snapshot.universeCount) || 0,
      liveCount: Number(snapshot.liveCount) || 0
    },
    market: {
      regime,
      contextScore,
      contextLabel: openSignals.length ? "Active structure is available for review." : "Low opportunity flow keeps the platform in orientation mode.",
      breadthRows: [
        { key: "open", label: "Open setups", value: openSignals.length, helper: openSignals.length ? "Current actionable structures." : "No open structures." },
        { key: "closed", label: "Resolved setups", value: closedSignals.length, helper: closedSignals.length ? "Useful for reviewing quality and follow-through." : "Nothing resolved yet." },
        { key: "live", label: "Live monitored", value: Number(snapshot.liveCount) || 0, helper: "Signals with active runtime monitoring." }
      ],
      conditions: [
        { label: "Regime", value: regime.label, helper: regime.helper },
        { label: "Scanner coverage", value: `${Number(snapshot.universeCount) || 0} symbols`, helper: "Breadth of the current tracked universe." },
        {
          label: "Primary bias",
          value: sideCounts.size ? Array.from(sideCounts.entries()).sort((left, right) => right[1] - left[1])[0][0] : "Balanced",
          helper: "Signal direction dominance within active setups."
        }
      ],
      signalMix: [
        ...toRows(sideCounts, (label, value) => `${value} ${label.toLowerCase()} opportunities currently open.`),
        ...toRows(timeframeCounts, (label, value) => `${value} opportunities are clustering on ${label}.`)
      ],
      mattersNow: [
        openSignals.length
          ? "Active setups exist, so move from market awareness into structured validation."
          : "There are no active setups, so the correct action is observation, not forced execution.",
        Number(snapshot.liveCount) > 0
          ? "Live monitoring is running; use the dashboard to stay focused on active structures."
          : "No live monitoring load is present; market context can stay broad and high level.",
        strategyNames.length
          ? `The scanner strategy footprint is ${strategyNames.join(", ")}.`
          : "Strategy metadata is unavailable, so prioritize raw structure and risk discipline."
      ]
    },
    dashboard: {
      executionReadiness,
      executionHelper: openSignals.length ? "There is enough structure to validate and monitor." : "No current setup justifies immediate action.",
      cooldownLabel: Number(snapshot.cooldownLeftMs) ? `${Math.ceil(snapshot.cooldownLeftMs / 1000)}s` : "Ready",
      validationChecks: [
        "Confirm the market page agrees with the signal before acting.",
        "Check entry, stop, and target structure against your risk plan.",
        "Use tools only after the opportunity is already context-valid.",
        "Return resolved trades to learn and docs for feedback."
      ],
      watchRows,
      primarySignal
    },
    news: {
      contextBoard: buildContextBoard({
        regime,
        openSignals: openSignals.length,
        strategies: strategyNames,
        timeframes
      })
    },
    scanner: {
      isRunning,
      sessionLabel: snapshot.session && snapshot.session !== "–" ? `Session ${snapshot.session}` : "No live session",
      status: {
        label: isRunning ? "Scanner running" : "Scanner idle",
        helper: isRunning ? "Execution layer is actively updating." : "Start a session to generate fresh market structure."
      }
    }
  };
};


