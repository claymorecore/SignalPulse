import type {
  ApiDashboardSummary,
  ApiMarketAsset,
  ApiMarketStructure,
  ApiMetric,
  ApiNewsItem,
  ApiSignal
} from "./api";

export type PlatformStatus = {
  label?: string;
  helper?: string;
};

export type PlatformSignal = ApiSignal;

export type PlatformContext = {
  signals: PlatformSignal[];
  market: {
    regime?: { label?: string; helper?: string };
    contextScore?: string;
    contextLabel?: string;
    assets?: ApiMarketAsset[];
    structure?: ApiMarketStructure;
  };
  dashboard: {
    summary?: ApiDashboardSummary;
    metrics?: ApiMetric[];
  };
  news: {
    contextBoard?: string[];
    items?: ApiNewsItem[];
  };
  scanner: {
    status?: PlatformStatus;
    sessionLabel?: string;
    pending?: boolean;
    feedback?: string;
    presets?: unknown[];
    start?: (_config: unknown) => Promise<void>;
    stop?: () => Promise<void>;
    reset?: () => Promise<void>;
    strategies?: Array<{ key?: string; name?: string }>;
  };
  dataState: {
    isLoading: boolean;
    error: Error | null;
  };
};
