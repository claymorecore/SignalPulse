import market from "../market/state.js";

const ACTIVE_STATUSES = new Set(["OPEN", "ACTIVE"]);

const num = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isActiveSignal = (signal) =>
  ACTIVE_STATUSES.has(String(signal?.status || "").trim().toUpperCase());

const getSignals = () => {
  const snapshot = market.snapshot();
  return Array.isArray(snapshot?.signals) ? snapshot.signals : [];
};

const buildRegime = ({ isRunning, openSignals, liveCount, universeCount }) => {
  if (!isRunning && openSignals === 0) {
    return {
      label: "Observation mode",
      helper: "The platform is monitoring conditions, but no active structure is demanding execution."
    };
  }

  if (openSignals >= 6 || liveCount >= 4) {
    return {
      label: "Expansion",
      helper: "Participation is broad enough that prioritization matters more than more input."
    };
  }

  if (openSignals >= 2 || universeCount >= 20) {
    return {
      label: "Selective trend",
      helper: "The market is offering setups, but quality control still matters more than speed."
    };
  }

  return {
    label: "Caution",
    helper: "Participation is thin enough that patience is part of the edge."
  };
};

const countBy = (items, getter) => {
  const map = new Map();

  for (const item of items) {
    const key = getter(item);
    map.set(key, (map.get(key) || 0) + 1);
  }

  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
};

export const getSnapshot = () => market.snapshot();

export const getMarketOverview = () => {
  const snapshot = getSnapshot();
  const signals = getSignals();
  const openSignals = signals.filter(isActiveSignal);
  const isRunning = String(snapshot?.status || "").toLowerCase() === "running";
  const universeCount = num(snapshot?.universeCount);
  const liveCount = num(snapshot?.liveCount);
  const regime = buildRegime({
    isRunning,
    openSignals: openSignals.length,
    liveCount,
    universeCount
  });

  return {
    regime,
    contextScore: `${Math.max(1, Math.min(10, openSignals.length + (isRunning ? 2 : 0)))}/10`,
    scannerStatus: isRunning ? "Scanner running" : "Scanner idle",
    trackedSignals: signals.length,
    activeSignals: openSignals.length,
    liveCount,
    universeCount,
    updatedAt: Date.now()
  };
};

export const getMarketStructure = () => {
  const snapshot = getSnapshot();
  const signals = getSignals();
  const openSignals = signals.filter(isActiveSignal);
  const strategyMix = countBy(openSignals, (signal) => signal?.setup || "Unclassified");
  const timeframeMix = countBy(openSignals, (signal) => signal?.tf || "N/A");
  const sideMix = countBy(openSignals, (signal) => String(signal?.side || "Neutral").toUpperCase());
  const regime = getMarketOverview().regime;

  return {
    regime,
    breadth: {
      openSignals: openSignals.length,
      resolvedSignals: Math.max(0, signals.length - openSignals.length),
      liveCount: num(snapshot?.liveCount),
      universeCount: num(snapshot?.universeCount)
    },
    signalMix: {
      side: sideMix,
      timeframe: timeframeMix,
      setup: strategyMix
    },
    mattersNow: [
      openSignals.length
        ? `${openSignals.length} active structures are live. Move into validation before execution.`
        : "No structures are currently active. Stay in awareness mode and wait for confirmation.",
      regime.helper,
      num(snapshot?.liveCount) > 0
        ? "Live monitoring is active, so focus on follow-through rather than more scanning."
        : "The platform is not under live load, so context can stay broad and high level."
    ]
  };
};

export const getTrackedAssets = (limit = 12) => {
  const snapshot = getSnapshot();
  const signals = getSignals();
  const openSignals = signals
    .filter(isActiveSignal)
    .sort((left, right) => num(right?.createdAt) - num(left?.createdAt));

  const assets = openSignals.slice(0, limit).map((signal) => ({
    symbol: signal.symbol || "N/A",
    direction: signal.side || "N/A",
    status: signal.status || "N/A",
    entry: Number.isFinite(Number(signal.entry)) ? Number(signal.entry) : null,
    live: Number.isFinite(Number(signal.live)) ? Number(signal.live) : null,
    pnlPct: Number.isFinite(Number(signal.pnlPct)) ? Number(signal.pnlPct) : null,
    timeframe: signal.tf || "N/A",
    updatedAt: signal.lastLiveTs || signal.lastScanTs || signal.createdAt || Date.now()
  }));

  if (assets.length) {
    return assets;
  }

  return [
    {
      symbol: "BTCUSDT",
      direction: "NEUTRAL",
      status: String(snapshot?.status || "idle").toUpperCase(),
      entry: null,
      live: null,
      pnlPct: null,
      timeframe: "N/A",
      updatedAt: Date.now()
    }
  ];
};
