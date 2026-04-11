import type { ApiDashboardSummary, ApiMetric } from "../../../types/api";
import { getDashboardMetrics, getDashboardSummary } from "../endpoints";
import useApiResource from "./useApiResource";

const emptySummary: ApiDashboardSummary = {
  session: 0,
  status: "Unavailable",
  focus: "Observation focus",
  primaryMessage: "Dashboard summary is not available yet.",
  readiness: "0%",
  watchlist: [],
  mattersNow: []
};

export default function useDashboard() {
  const summary = useApiResource<ApiDashboardSummary>(
    "useDashboard.summary",
    getDashboardSummary,
    { initialData: emptySummary }
  );
  const metrics = useApiResource<ApiMetric[]>(
    "useDashboard.metrics",
    getDashboardMetrics,
    { initialData: [] }
  );

  return {
    summary,
    metrics,
    refetchAll: async () => {
      await Promise.all([summary.refetch(), metrics.refetch()]);
    }
  };
}
