import CTASection from "../components/sections/CTASection";
import PageHeroSection from "../components/sections/PageHeroSection";
import PageContainer from "../components/layout/PageContainer";
import Section from "../components/layout/Section";
import SectionHeader from "../components/layout/SectionHeader";
import Grid from "../components/layout/Grid";
import Card from "../components/cards/Card";
import EmptyState from "../components/feedback/EmptyState";
import ErrorFallback from "../components/feedback/ErrorFallback";
import LoadingState from "../components/feedback/LoadingState";
import usePlatformContext from "../hooks/usePlatformContext";

export default function SignalsPage() {
  const platform = usePlatformContext();
  const signals = platform.signals.slice(0, 6);

  if (platform.dataState.isLoading && !platform.signals.length) {
    return <LoadingState title="Loading signals" description="SignalPulse is preparing the intelligence layer." />;
  }

  if (platform.dataState.error && !platform.signals.length) {
    return <ErrorFallback title="Signals are unavailable" description="The signal feed could not be loaded safely. The rest of the product remains available." />;
  }

  return (
    <>
      <PageHeroSection
        eyebrow="Intelligence layer"
        title="Signals organized into decisions, not noise."
        description="Signals converts raw opportunity flow into structured setups with context, priority, and validation cues."
        primary={{ label: "Open Dashboard", to: "/dashboard" }}
        secondary={{ label: "View Market", to: "/market" }}
        preview={{
          title: "Signal feed",
          chips: ["Priority", "Setup", "Validation"],
          rows: [
            { label: "Validated setups", value: String(platform.market.structure?.breadth.openSignals ?? 0) },
            { label: "Context confidence", value: platform.market.contextScore ?? "N/A" },
            { label: "Execution readiness", value: platform.dashboard.summary?.readiness ?? "N/A" },
          ],
        }}
      />
      <Section>
        <PageContainer>
          <SectionHeader
            eyebrow="Structured feed"
            title="High-conviction setups only"
            lead="Each item below is framed for scanning: what changed, why it matters, and what to validate next."
          />
          {signals.length ? (
            <Grid columns={3}>
              {signals.map((signal) => (
                <Card key={signal.id || signal.key || `${signal.symbol}-${signal.createdAt}`}>
                  <div className="card__header">
                    <h3 className="card__title">{signal.symbol}</h3>
                    <p className="card__description">
                      {signal.thesis
                        ? signal.thesis
                        : signal.setupType || signal.setup
                          ? `${signal.setupType || signal.setup} setup with ${signal.direction || signal.side || "neutral"} bias.`
                          : "Signal context available in live feed."}
                    </p>
                  </div>
                  <p className="card__meta">
                    {signal.status || "Latest snapshot"}
                    {signal.qualityTier ? ` · Tier ${signal.qualityTier}` : ""}
                    {Number.isFinite(signal.confidenceScore) ? ` · ${signal.confidenceScore.toFixed(0)} score` : ""}
                    {Number.isFinite(signal.pnlPct) ? ` · ${signal.pnlPct.toFixed(2)}%` : ""}
                  </p>
                </Card>
              ))}
            </Grid>
          ) : (
            <EmptyState
              title="No valid signal snapshots yet"
              description="Signal cards appear only when the feed provides usable context. Empty states stay clean instead of guessing."
            />
          )}
        </PageContainer>
      </Section>
      <CTASection
        title="Validate what matters, then monitor execution."
        description="Signals should shorten decision time. Once a setup survives validation, the dashboard becomes the monitoring surface."
        primary={{ label: "Open Dashboard", to: "/dashboard" }}
        secondary={{ label: "Read Methodology", to: "/docs" }}
      />
    </>
  );
}



