import CTASection from "../components/sections/CTASection";
import PageHeroSection from "../components/sections/PageHeroSection";
import StatsStripSection from "../components/sections/StatsStripSection";
import SystemOverviewSection from "../components/sections/SystemOverviewSection";
import ErrorFallback from "../components/feedback/ErrorFallback";
import LoadingState from "../components/feedback/LoadingState";
import usePlatformContext from "../hooks/usePlatformContext";
import type { FeatureItem } from "../types/content";

export default function MarketPage() {
  const platform = usePlatformContext();

  if (platform.dataState.isLoading && platform.signals.length === 0 && platform.market.contextScore === "N/A") {
    return <LoadingState title="Loading market overview" description="SignalPulse is preparing the awareness layer." />;
  }

  if (platform.dataState.error && platform.signals.length === 0) {
    return <ErrorFallback title="Market data is unavailable" description="The market layer could not load safely. You can retry from the home route while backend data reconnects." />;
  }

  const metrics = [
    { label: "Market regime", value: platform.market.regime?.label ?? "Unavailable", description: "High-level state before drilling into setups." },
    { label: "Context score", value: platform.market.contextScore ?? "N/A", description: "A compressed view of how actionable the current market feels." },
    { label: "Scanner status", value: platform.scanner.status?.label ?? "Idle", description: "Monitoring quality and freshness of platform inputs." },
    { label: "Signals tracked", value: String(platform.signals.length), description: "Structured signals available for context and follow-through." },
  ];

  const items: FeatureItem[] = [
    { icon: "grid", title: "State first", description: "A clean summary of breadth, trend, and participation before any trade thinking." },
    { icon: "signal", title: "Contextual news", description: "Only events that change structure, liquidity, or volatility are surfaced." },
    { icon: "layers", title: "Decision framing", description: "Every market condition is translated into what matters next." },
  ];

  return (
    <>
      <PageHeroSection
        eyebrow="Awareness layer"
        title="Understand the market before interpreting signals."
        description="Market is the orientation layer for breadth, regime, and conditions. It answers what is happening right now without flooding the screen."
        primary={{ label: "View Signals", to: "/signals" }}
        secondary={{ label: "Read News", to: "/news" }}
        preview={{
          title: "Market overview",
          chips: ["Breadth", "Regime", "Liquidity"],
          rows: [
            { label: "Trend alignment", value: platform.market.contextScore ?? "N/A" },
            { label: "Participation", value: String(platform.market.structure?.breadth.universeCount ?? 0) },
            { label: "Risk appetite", value: String(platform.market.structure?.breadth.liveCount ?? 0) },
          ],
        }}
      />
      <StatsStripSection metrics={metrics} />
      <SystemOverviewSection eyebrow="Overview" title="A calmer market read" lead="The market layer keeps the first screen high-signal and high-trust." items={items} />
      <CTASection
        title="Move from awareness into interpretation."
        description="Once the market state is clear, SignalPulse routes you into signals with context already attached."
        primary={{ label: "Open Signals", to: "/signals" }}
        secondary={{ label: "Open Dashboard", to: "/dashboard" }}
      />
    </>
  );
}



