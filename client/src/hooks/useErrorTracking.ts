import { useCallback } from "react";
import { logger } from "../lib/logger";
import { appConfig } from "../lib/config";

type ErrorMetadata = {
  source?: string;
  componentStack?: string;
  [key: string]: unknown;
};

type CaptureErrorFn = (..._args: [Error, ErrorMetadata?]) => void;
type TrackPayload = Record<string, unknown>;
type TrackPerformanceFn = (..._args: [string, TrackPayload?]) => void;
type TrackUserFlowFn = (..._args: [string, TrackPayload?]) => void;

declare global {
  interface Window {
    __SIGNALPULSE_MONITORING__?: {
      captureError?: CaptureErrorFn;
      trackPerformance?: TrackPerformanceFn;
      trackUserFlow?: TrackUserFlowFn;
    };
  }
}

export default function useErrorTracking() {
  return useCallback((error: Error, metadata?: ErrorMetadata) => {
    logger.error(error.message, metadata);

    if (appConfig.featureFlags.errorTracking) {
      window.__SIGNALPULSE_MONITORING__?.captureError?.(error, metadata);
    }
  }, []);
}
