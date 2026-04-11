import { createSignalEngineConfig } from "./config.js";
import evaluateMarketContext from "./context/evaluateContext.js";
import detectorRegistry from "./detectors/index.js";
import buildSignalExplanation from "./explain/buildExplanation.js";
import scoreCandidate from "./scoring/scoreCandidate.js";
import { SIGNAL_SOURCES, SIGNAL_STATUSES } from "./types.js";
import { normalizeCandles } from "./utils/candles.js";
import validateCandidate from "./validators/validateCandidate.js";

const now = () => Date.now();

const buildSignalId = ({ symbol, timeframe, candidate, timestamp }) =>
  [symbol, timeframe, candidate.setupType, candidate.direction, Math.floor(timestamp)].join("|");

export const runSignalEngine = ({
  symbol,
  timeframe,
  candles,
  assetMeta = {},
  config: overrides = {},
  source = SIGNAL_SOURCES.ENGINE,
  debug = false
}) => {
  const config = createSignalEngineConfig(overrides);
  const normalizedCandles = normalizeCandles(candles);
  const context = evaluateMarketContext({ candles: normalizedCandles, config, assetMeta });
  const timestamp = normalizedCandles[normalizedCandles.length - 1]?.closeTime || now();

  const candidates = [];
  const suppressed = [];
  const surfaced = [];

  for (const detector of detectorRegistry) {
    if (!config.enabledSetupTypes.includes(detector.setupType)) continue;

    const candidate = detector.detect({
      symbol,
      timeframe,
      candles: normalizedCandles,
      assetMeta,
      config,
      context
    });

    if (!candidate) continue;

    const validation = validateCandidate({
      candidate,
      context,
      candles: normalizedCandles,
      config
    });
    const score = scoreCandidate({ candidate, context, validation, config });
    const explanation = buildSignalExplanation({
      symbol,
      timeframe,
      candidate,
      context,
      validation,
      score
    });

    const signal = {
      id: buildSignalId({ symbol, timeframe, candidate, timestamp }),
      symbol,
      timeframe,
      direction: candidate.direction,
      setupType: candidate.setupType,
      regime: candidate.regime,
      entry: Number(candidate.entry.toFixed(4)),
      stopLoss: Number(candidate.stopLoss.toFixed(4)),
      takeProfit: Number(candidate.takeProfit.toFixed(4)),
      rr: Number(candidate.rr.toFixed(2)),
      confidenceScore: score.confidenceScore,
      qualityTier: score.qualityTier,
      status: score.surfaced ? SIGNAL_STATUSES.VALIDATED : SIGNAL_STATUSES.DETECTED,
      timestamp,
      thesis: explanation.thesis,
      whyNow: explanation.whyNow,
      invalidation: explanation.whatInvalidates,
      whyItPassed: explanation.whyItPassed,
      riskNotes: explanation.riskNotes,
      contextTags: candidate.contextTags,
      metrics: candidate.metrics,
      source,
      createdAt: timestamp,
      updatedAt: timestamp,
      scoringBreakdown: score.breakdown,
      validation: {
        passed: validation.passed,
        failedChecks: validation.failedChecks
      }
    };

    candidates.push(signal);
    if (score.surfaced) surfaced.push(signal);
    else suppressed.push(signal);
  }

  const dedupedSurfaced = surfaced
    .sort((left, right) => right.confidenceScore - left.confidenceScore)
    .filter((signal, index, list) => {
      const earlier = list.slice(0, index);
      return !earlier.some(
        (existing) => existing.symbol === signal.symbol && existing.timeframe === signal.timeframe
      );
    });

  return {
    symbol,
    timeframe,
    source,
    contextSummary: context,
    surfacedSignals: dedupedSurfaced,
    suppressedSignals: debug ? suppressed : [],
    suppressedCount: suppressed.length,
    candidateCount: candidates.length,
    timestamp
  };
};

export const runSignalEngineBatch = ({ datasets, config, source, debug = false }) => {
  const runs = (Array.isArray(datasets) ? datasets : []).map((dataset) =>
    runSignalEngine({
      ...dataset,
      config,
      source,
      debug
    })
  );

  return {
    scannedAt: now(),
    source,
    contextSummary: runs.map((run) => ({
      symbol: run.symbol,
      timeframe: run.timeframe,
      ...run.contextSummary
    })),
    surfacedSignals: runs.flatMap((run) => run.surfacedSignals),
    suppressedCount: runs.reduce((sum, run) => sum + run.suppressedCount, 0),
    runs
  };
};

export default {
  runSignalEngine,
  runSignalEngineBatch
};
