import { useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { appConfig } from "../lib/config";
import { logger } from "../lib/logger";

export default function usePerformanceTracking() {
  const location = useLocation();

  useEffect(() => {
    if (!appConfig.featureFlags.performanceTracking) return undefined;

    const path = location.pathname;
    const markStart = `route-start:${path}`;
    const markEnd = `route-end:${path}`;
    const measureName = `route-load:${path}`;

    performance.mark(markStart);

    requestAnimationFrame(() => {
      performance.mark(markEnd);
      performance.measure(measureName, markStart, markEnd);
      const [entry] = performance.getEntriesByName(measureName).slice(-1);

      if (appConfig.isDev && entry) {
        logger.info("Route load measured", { path, duration: entry.duration });
      }

      window.__SIGNALPULSE_MONITORING__?.trackPerformance?.("route-load", {
        path,
        duration: entry?.duration,
      });

      performance.clearMarks(markStart);
      performance.clearMarks(markEnd);
      performance.clearMeasures(measureName);
    });

    return undefined;
  }, [location.pathname]);

  const trackInteraction = useCallback((name: string, startedAt = performance.now()) => {
    const duration = performance.now() - startedAt;

    if (appConfig.isDev) {
      logger.info("Interaction measured", { name, duration });
    }

    window.__SIGNALPULSE_MONITORING__?.trackPerformance?.("interaction", {
      name,
      duration,
    });
  }, []);

  return { trackInteraction };
}
