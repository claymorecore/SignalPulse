export type ApiMetric = {
  key: string;
  label: string;
  value: string;
  description: string;
};

export type ApiSignal = {
  id?: string;
  key?: string;
  symbol: string;
  tf?: string;
  timeframe?: string;
  setup?: string;
  setupType?: string;
  side?: string;
  direction?: "long" | "short";
  status: string;
  regime?: string;
  entry: number | null;
  sl?: number | null;
  stopLoss?: number | null;
  tp?: number | null;
  takeProfit?: number | null;
  rr: number | null;
  confidenceScore?: number;
  qualityTier?: string;
  createdAt: number;
  updatedAt?: number;
  timestamp?: number;
  lastScanTs?: number;
  lastLiveTs?: number;
  live?: number | null;
  pnlPct?: number | null;
  pnlUsdt?: number | null;
  thesis?: string;
  invalidation?: string;
  whyNow?: string;
  whyItPassed?: string;
  riskNotes?: string[];
  contextTags?: string[];
  metrics?: Record<string, unknown>;
  source?: string;
  scoringBreakdown?: Record<string, number>;
  history: Array<{
    t: number;
    p: number;
    pp: number;
    u: number;
  }>;
};

export type ApiMarketOverview = {
  regime: {
    label: string;
    helper: string;
  };
  contextScore: string;
  scannerStatus: string;
  trackedSignals: number;
  activeSignals: number;
  liveCount: number;
  universeCount: number;
  updatedAt: number;
};

export type ApiMarketStructure = {
  regime: {
    label: string;
    helper: string;
  };
  breadth: {
    openSignals: number;
    resolvedSignals: number;
    liveCount: number;
    universeCount: number;
  };
  signalMix: {
    side: Array<{ label: string; value: number }>;
    timeframe: Array<{ label: string; value: number }>;
    setup: Array<{ label: string; value: number }>;
  };
  mattersNow: string[];
};

export type ApiMarketAsset = {
  symbol: string;
  direction: string;
  status: string;
  entry: number | null;
  live: number | null;
  pnlPct: number | null;
  timeframe: string;
  updatedAt: number;
};

export type ApiDashboardSummary = {
  session: number;
  status: string;
  focus: string;
  primaryMessage: string;
  readiness: string;
  watchlist: ApiMarketAsset[];
  mattersNow: string[];
};

export type ApiNewsItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  context: string;
  category: string;
  publishedAt: string;
  source: string;
};

export type ApiContentItem = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  body: string[];
};

export type ApiListResponse<T> = {
  ok: true;
  items: T[];
  total: number;
};
