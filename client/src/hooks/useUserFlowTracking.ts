import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { logger } from "../lib/logger";
import { appConfig } from "../lib/config";

export default function useUserFlowTracking() {
  const location = useLocation();

  useEffect(() => {
    if (!appConfig.featureFlags.userFlowTracking) return;

    const payload = { path: location.pathname };

    if (appConfig.isDev) {
      logger.info("Route changed", payload);
    }

    window.__SIGNALPULSE_MONITORING__?.trackUserFlow?.("route-view", payload);
  }, [location.pathname]);
}
