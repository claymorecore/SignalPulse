import CTASection from "../components/sections/CTASection";
import PageHeroSection from "../components/sections/PageHeroSection";
import StatsStripSection from "../components/sections/StatsStripSection";
import ErrorFallback from "../components/feedback/ErrorFallback";
import LoadingState from "../components/feedback/LoadingState";
import usePlatformContext from "../hooks/usePlatformContext";

export default function DashboardPage() {
  const platform = usePlatformContext();
  const metrics = platform.dashboard.metrics?.length
    ? platform.dashboard.metrics
    : [
        { key: "active", label: "Active instruments", value: String(platform.signals.length), description: "Symbols under active platform observation." },
        { key: "session", label: "Session", value: platform.scanner.sessionLabel ?? "Unavailable", description: "Current backend context feeding dashboard focus." },
      ];

  if (platform.dataState.isLoading && !platform.dashboard.metrics?.length) {
    return <LoadingState title="Loading dashboard" description="SignalPulse is preparing the execution layer." />;
  }

  if (platform.dataState.error && !platform.dashboard.metrics?.length) {
    return <ErrorFallback title="Dashboard data is unavailable" description="The execution surface could not be loaded safely. You can continue using the rest of the platform." />;
  }

  return (
    <>
      <PageHeroSection
        eyebrow="Execution layer"
        title="Monitor active context without losing the bigger picture."
        description="Dashboard is the focused operating surface for follow-through, active monitoring, and trade structure awareness."
        primary={{ label: "Open Tools", to: "/tools" }}
        secondary={{ label: "Review Learn", to: "/learn" }}
        preview={{
          title: "Execution dashboard",
          chips: ["Watchlist", "Risk", "State"],
          rows: [
            { label: "Watchlist focus", value: platform.dashboard.summary?.focus ?? "Observation focus" },
            { label: "Risk alignment", value: platform.dashboard.summary?.readiness ?? "N/A" },
            { label: "Follow-through", value: platform.scanner.status?.label ?? "Idle" },
          ],
        }}
      />
      <StatsStripSection metrics={metrics} />
      <CTASection
        title="Move from monitoring into action with discipline."
        description="The dashboard stays lean so execution decisions remain grounded in context, not clutter."
        primary={{ label: "Open Tools", to: "/tools" }}
        secondary={{ label: "Back to Signals", to: "/signals" }}
      />
    </>
  );
}



