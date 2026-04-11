import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";
import { scannerPresets } from "../lib/platform";
import { logger } from "../lib/logger";
import useErrorTracking from "./useErrorTracking";
import useMarket from "../lib/api/hooks/useMarket";
import useSignals from "../lib/api/hooks/useSignals";
import useDashboard from "../lib/api/hooks/useDashboard";
import useNews from "../lib/api/hooks/useNews";
import useRealtime from "./useRealtime";

export default function usePlatformData() {
  const captureError = useErrorTracking();
  const [scannerStatus, setScannerStatus] = useState<{
    running?: boolean;
    session?: number;
  } | null>(null);
  const [strategies, setStrategies] = useState<Array<{ key?: string; name?: string }>>([]);
  const [pendingAction, setPendingAction] = useState(false);
  const [feedback, setFeedback] = useState("The dashboard is ready for the next scanner action.");
  const market = useMarket();
  const signals = useSignals(500);
  const dashboard = useDashboard();
  const news = useNews();

  const refreshReferenceData = useCallback(async () => {
    try {
      const [statusResult, strategyResult] = await Promise.all([
        apiGet<{ ok: true; running?: boolean; session?: number }>("/api/scanner/status"),
        apiGet<{ ok: true; strategies?: Array<{ key?: string; name?: string }> }>("/api/strategies")
      ]);

      setScannerStatus(statusResult);
      setStrategies(Array.isArray(strategyResult?.strategies) ? strategyResult.strategies : []);
    } catch (error) {
      captureError(error as Error, { source: "usePlatformData.refreshReferenceData" });
      setFeedback(`Reference data unavailable: ${error?.message || String(error)}`);
    }
  }, [captureError]);

  useEffect(() => {
    Promise.resolve().then(refreshReferenceData);
  }, [refreshReferenceData]);

  const refetchLiveData = useCallback(async () => {
    await Promise.all([
      market.refetchAll(),
      signals.refetch(),
      dashboard.refetchAll(),
    ]);
  }, [dashboard, market, signals]);

  useRealtime({
    onEvent: (event) => {
      if (event.type === "HELLO" || (event.type === "EVT" && typeof event.evt?.type === "string")) {
        const eventType = event.type === "HELLO" ? "HELLO" : event.evt?.type;
        if (["HELLO", "STATE", "SIGNAL_NEW", "SIGNAL_UPDATE", "SIGNAL_REMOVE", "SIGNALS_CLEARED"].includes(String(eventType))) {
          void refetchLiveData();
        }
      }
    }
  });

  const runScannerAction = useCallback(async (path, payload, successMessage) => {
    setPendingAction(true);
    logger.info("Scanner action started", { path });

    try {
      await apiPost(path, payload || {});
      setFeedback(successMessage);
      await Promise.all([refreshReferenceData(), refetchLiveData()]);
    } catch (error) {
      captureError(error as Error, { source: "usePlatformData.runScannerAction", path });
      setFeedback(error?.message || "Unable to update scanner state.");
    } finally {
      setPendingAction(false);
    }
  }, [captureError, refreshReferenceData, refetchLiveData]);

  const dataError = market.overview.error || market.structure.error || signals.error || dashboard.summary.error || news.error || null;
  const isLoading = market.overview.isLoading || market.structure.isLoading || signals.isLoading || dashboard.summary.isLoading || news.isLoading;

  return {
    signals: signals.data,
    market: {
      regime: market.overview.data.regime,
      contextScore: market.overview.data.contextScore,
      contextLabel: market.structure.data.mattersNow[0] ?? market.overview.data.regime.helper,
      assets: market.assets.data,
      structure: market.structure.data
    },
    dashboard: {
      summary: dashboard.summary.data,
      metrics: dashboard.metrics.data
    },
    news: {
      items: news.data,
      contextBoard: news.data.length
        ? news.data.slice(0, 4).map((item) => `${item.title}. ${item.context}`)
        : market.structure.data.mattersNow
    },
    scanner: {
      isRunning: Boolean(scannerStatus?.running),
      sessionLabel: scannerStatus?.session ? `Session ${scannerStatus.session}` : "No live session",
      status: {
        label: scannerStatus?.running ? "Scanner running" : market.overview.data.scannerStatus,
        helper: scannerStatus?.running
          ? "Execution layer is actively updating."
          : "Start a session to generate fresh market structure."
      },
      pending: pendingAction,
      feedback,
      presets: scannerPresets,
      strategies,
      start: (config) => runScannerAction("/api/scanner/start", config, "Scanner started with the selected configuration."),
      stop: () => runScannerAction("/api/scanner/stop", {}, "Scanner stopped. Existing state remains available for review."),
      reset: () => runScannerAction("/api/scanner/reset", {}, "Scanner state reset. The dashboard has been cleared.")
    },
    dataState: {
      isLoading,
      error: dataError
    }
  };
}


