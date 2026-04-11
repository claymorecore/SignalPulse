import type { ApiMarketAsset, ApiMarketOverview, ApiMarketStructure } from "../../../types/api";
import { getMarketAssets, getMarketOverview, getMarketStructure } from "../endpoints";
import useApiResource from "./useApiResource";

const emptyOverview: ApiMarketOverview = {
  regime: { label: "Unavailable", helper: "Market overview is not available yet." },
  contextScore: "N/A",
  scannerStatus: "Unavailable",
  trackedSignals: 0,
  activeSignals: 0,
  liveCount: 0,
  universeCount: 0,
  updatedAt: 0
};

const emptyStructure: ApiMarketStructure = {
  regime: { label: "Unavailable", helper: "Market structure is not available yet." },
  breadth: { openSignals: 0, resolvedSignals: 0, liveCount: 0, universeCount: 0 },
  signalMix: { side: [], timeframe: [], setup: [] },
  mattersNow: []
};

export default function useMarket() {
  const overview = useApiResource<ApiMarketOverview>(
    "useMarket.overview",
    getMarketOverview,
    { initialData: emptyOverview }
  );
  const structure = useApiResource<ApiMarketStructure>(
    "useMarket.structure",
    getMarketStructure,
    { initialData: emptyStructure }
  );
  const assets = useApiResource<ApiMarketAsset[]>(
    "useMarket.assets",
    () => getMarketAssets(12),
    { initialData: [] }
  );

  return {
    overview,
    structure,
    assets,
    refetchAll: async () => {
      await Promise.all([overview.refetch(), structure.refetch(), assets.refetch()]);
    }
  };
}
