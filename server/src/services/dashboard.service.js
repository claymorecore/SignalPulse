import * as marketService from "./market.service.js";

const num = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getDashboardSummary = () => {
  const overview = marketService.getMarketOverview();
  const structure = marketService.getMarketStructure();
  const snapshot = marketService.getSnapshot();

  return {
    session: snapshot?.session ?? 0,
    status: overview.scannerStatus,
    focus: overview.activeSignals ? "Execution focus" : "Observation focus",
    primaryMessage: overview.activeSignals
      ? "Active setups are available. Stay selective and monitor follow-through."
      : "No active setups are currently forcing execution. Preserve clarity.",
    readiness: overview.activeSignals ? `${Math.min(100, 40 + overview.activeSignals * 10)}%` : "34%",
    watchlist: marketService.getTrackedAssets(6),
    mattersNow: structure.mattersNow
  };
};

export const getDashboardMetrics = () => {
  const overview = marketService.getMarketOverview();
  const snapshot = marketService.getSnapshot();

  return [
    {
      key: "active-signals",
      label: "Active instruments",
      value: String(overview.trackedSignals),
      description: "Symbols under active platform observation."
    },
    {
      key: "session",
      label: "Session",
      value: snapshot?.session ? `Session ${snapshot.session}` : "No live session",
      description: "Current backend context feeding dashboard focus."
    },
    {
      key: "scanner-status",
      label: "Scanner status",
      value: overview.scannerStatus,
      description: "Runtime freshness behind the current monitoring surface."
    },
    {
      key: "live-count",
      label: "Live monitored",
      value: String(num(snapshot?.liveCount)),
      description: "Signals currently receiving live runtime updates."
    }
  ];
};
