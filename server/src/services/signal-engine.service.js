import binance from "../binance/client.js";
import market from "../market/state.js";
import { log } from "../middleware/log.js";
import {
  createSignalEngineConfig,
  runSignalEngineBatch,
  SIGNAL_SOURCES,
  SIGNAL_STATUSES
} from "../signal-engine/index.js";

const ACTIVE_MARKET_STATUSES = new Set(["OPEN", "ACTIVE"]);
const CLOSED_MARKET_STATUSES = new Set(["TP", "SL", "CLOSED", "EXPIRED"]);

let lastEngineScan = {
  scannedAt: 0,
  source: SIGNAL_SOURCES.ENGINE,
  contextSummary: [],
  surfacedSignals: [],
  suppressedCount: 0,
  runs: []
};

const now = () => Date.now();

const toRegimeFromSignal = (signal) =>
  String(signal?.side || "").toUpperCase() === "LONG"
    ? "bullish"
    : String(signal?.side || "").toUpperCase() === "SHORT"
      ? "bearish"
      : "neutral";

const toStatus = (signal) => {
  const raw = String(signal?.status || "").toUpperCase();
  if (ACTIVE_MARKET_STATUSES.has(raw)) return SIGNAL_STATUSES.ACTIVE;
  if (raw === "NEW") return SIGNAL_STATUSES.DETECTED;
  if (CLOSED_MARKET_STATUSES.has(raw)) return SIGNAL_STATUSES.CLOSED;
  return SIGNAL_STATUSES.DETECTED;
};

const toQualityTier = (rr) => {
  if (rr >= 2.4) return "A";
  if (rr >= 1.8) return "B";
  return "C";
};

const confidenceFromStoredSignal = (signal) => {
  const rr = Number(signal?.rr);
  const pnlPct = Number(signal?.pnlPct);
  const status = String(signal?.status || "").toUpperCase();

  let score = 55;
  if (Number.isFinite(rr)) score += Math.min(20, rr * 8);
  if (status === "OPEN" || status === "ACTIVE") score += 10;
  if (Number.isFinite(pnlPct)) score += Math.max(-8, Math.min(8, pnlPct / 2));

  return Math.max(0, Math.min(100, Number(score.toFixed(2))));
};

const enrichStoredSignal = (signal) => {
  const direction = String(signal?.side || "").toUpperCase() === "SHORT" ? "short" : "long";
  const timestamp = signal?.createdAt || signal?.lastScanTs || now();
  const rr = Number.isFinite(Number(signal?.rr)) ? Number(signal.rr) : 0;
  const setupType = String(signal?.setup || "scanner").toLowerCase() === "ema_atr"
    ? "trend_continuation"
    : String(signal?.setup || "scanner").toLowerCase();
  const confidenceScore = confidenceFromStoredSignal(signal);

  return {
    id: signal?.key || [signal?.symbol, signal?.tf, signal?.setup, signal?.side].filter(Boolean).join("|"),
    symbol: signal?.symbol || "N/A",
    timeframe: signal?.tf || "N/A",
    direction,
    setupType,
    regime: toRegimeFromSignal(signal),
    entry: Number.isFinite(Number(signal?.entry)) ? Number(signal.entry) : null,
    stopLoss: Number.isFinite(Number(signal?.sl)) ? Number(signal.sl) : null,
    takeProfit: Number.isFinite(Number(signal?.tp)) ? Number(signal.tp) : null,
    rr: Number.isFinite(rr) ? Number(rr.toFixed(2)) : null,
    confidenceScore,
    qualityTier: toQualityTier(rr),
    status: toStatus(signal),
    timestamp,
    thesis: `${signal?.symbol || "Asset"} is being tracked as a ${signal?.setup || "structured"} ${direction} setup on ${signal?.tf || "unknown timeframe"}.`,
    whyNow: `The scanner has an active ${signal?.status || "tracked"} state for this structure and it remains part of the current market view.`,
    invalidation: Number.isFinite(Number(signal?.sl))
      ? `The setup is invalidated if price trades through ${Number(signal.sl).toFixed(4)}.`
      : "Invalidation is defined by the scanner state and stop structure.",
    whyItPassed: "The setup survived the live scanner filters and remains part of the curated signal set.",
    riskNotes: [
      Number.isFinite(rr)
        ? `Scanner risk/reward is currently ${rr.toFixed(2)}.`
        : "Risk/reward is not available for this scanner signal.",
      signal?.status
        ? `Current lifecycle state is ${String(signal.status).toLowerCase()}.`
        : "Lifecycle state is unavailable."
    ],
    contextTags: [
      `scanner:${signal?.setup || "unknown"}`,
      `timeframe:${signal?.tf || "unknown"}`,
      `status:${String(signal?.status || "unknown").toLowerCase()}`
    ],
    metrics: {
      live: Number.isFinite(Number(signal?.live)) ? Number(signal.live) : null,
      pnlPct: Number.isFinite(Number(signal?.pnlPct)) ? Number(signal.pnlPct) : null,
      pnlUsdt: Number.isFinite(Number(signal?.pnlUsdt)) ? Number(signal.pnlUsdt) : null
    },
    source: SIGNAL_SOURCES.SCANNER,
    createdAt: timestamp,
    updatedAt: signal?.lastLiveTs || signal?.lastScanTs || timestamp
  };
};

const listStoredSignals = (limit = 500) =>
  market
    .listSignals(limit)
    .map(enrichStoredSignal)
    .sort((left, right) => right.createdAt - left.createdAt);

const buildDatasetsFromPayload = async ({ symbols, timeframes, limit = 120 }) => {
  const uniqueSymbols = Array.isArray(symbols) && symbols.length
    ? Array.from(new Set(symbols.map((symbol) => String(symbol).trim()).filter(Boolean)))
    : Array.from(new Set((market.S.universe || []).slice(0, 6)));
  const frames = Array.isArray(timeframes) && timeframes.length ? timeframes : ["1m", "5m"];

  const datasets = [];
  for (const symbol of uniqueSymbols) {
    for (const timeframe of frames) {
      const candles = await binance.fetchKlines(symbol, timeframe, limit);
      datasets.push({
        symbol,
        timeframe,
        candles
      });
    }
  }

  return datasets;
};

export const listSignals = ({ limit = 500 } = {}) => listStoredSignals(limit);

export const getSignalById = (id) => {
  const stored = listStoredSignals(1000);
  const fromStore = stored.find((signal) => signal.id === id);
  if (fromStore) return fromStore;
  return lastEngineScan.surfacedSignals.find((signal) => signal.id === id) || null;
};

export const getActiveSignals = ({ limit = 200 } = {}) =>
  listStoredSignals(limit).filter((signal) =>
    [SIGNAL_STATUSES.ACTIVE, SIGNAL_STATUSES.VALIDATED, SIGNAL_STATUSES.DETECTED].includes(signal.status)
  );

export const getSignalHistory = ({ limit = 200 } = {}) =>
  listStoredSignals(limit).filter((signal) =>
    [SIGNAL_STATUSES.CLOSED, SIGNAL_STATUSES.EXPIRED, SIGNAL_STATUSES.INVALIDATED].includes(signal.status)
  );

export const getEngineSummary = () => ({
  scannedAt: lastEngineScan.scannedAt,
  source: lastEngineScan.source,
  surfacedCount: lastEngineScan.surfacedSignals.length,
  suppressedCount: lastEngineScan.suppressedCount,
  contextSummary: lastEngineScan.contextSummary,
  activeStoreCount: getActiveSignals().length
});

export const scanSignals = async (payload = {}, { source = SIGNAL_SOURCES.ENGINE } = {}) => {
  const config = createSignalEngineConfig(payload.config || {});
  const datasets = Array.isArray(payload.datasets) && payload.datasets.length
    ? payload.datasets
    : await buildDatasetsFromPayload({
        symbols: payload.symbols,
        timeframes: payload.timeframes,
        limit: payload.limit
      });

  const result = runSignalEngineBatch({
    datasets,
    config,
    source,
    debug: Boolean(payload.debug)
  });

  lastEngineScan = result;
  log.info("SIGNAL_ENGINE_SCAN", {
    scannedAt: result.scannedAt,
    datasets: datasets.length,
    surfaced: result.surfacedSignals.length,
    suppressed: result.suppressedCount
  });

  return result;
};

export const replaySignals = async (payload = {}) =>
  scanSignals(payload, { source: SIGNAL_SOURCES.REPLAY });

export const getLastEngineScan = () => lastEngineScan;

export default {
  listSignals,
  getSignalById,
  getActiveSignals,
  getSignalHistory,
  getEngineSummary,
  scanSignals,
  replaySignals,
  getLastEngineScan
};
