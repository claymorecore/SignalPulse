import CTASection from "../components/sections/CTASection";
import NewsGridSection from "../components/sections/NewsGridSection";
import PageHeroSection from "../components/sections/PageHeroSection";
import ErrorFallback from "../components/feedback/ErrorFallback";
import LoadingState from "../components/feedback/LoadingState";
import usePlatformContext from "../hooks/usePlatformContext";
import type { NewsCardItem } from "../types/content";

export default function NewsPage() {
  const platform = usePlatformContext();
  if (platform.dataState.isLoading && !platform.news.items?.length) {
    return <LoadingState title="Loading news" description="SignalPulse is preparing the relevance-filtered news layer." />;
  }

  if (platform.dataState.error && !platform.news.items?.length) {
    return <ErrorFallback title="News is unavailable" description="The news layer could not be loaded safely. The rest of the platform remains available." />;
  }

  const items: NewsCardItem[] = Array.isArray(platform.news.items) && platform.news.items.length
    ? platform.news.items.slice(0, 6).map((item) => ({
        title: item.title,
        preview: item.summary,
        context: item.context,
        tag: item.category,
      }))
    : [
        {
          title: "No market-moving news is currently validated",
          preview: "The news layer stays quiet when there is nothing worth acting on.",
          context: "No filler, no raw feed spam.",
          tag: "Filtered",
        },
      ];

  return (
    <>
      <PageHeroSection
        eyebrow="Awareness + context"
        title="Curated news connected to market meaning."
        description="News is filtered for relevance, then tied back to market structure so users can understand what changed and whether it matters."
        primary={{ label: "Open Market", to: "/market" }}
        secondary={{ label: "Open Signals", to: "/signals" }}
        preview={{
          title: "News context",
          chips: ["Curated", "Relevant", "Connected"],
          rows: [
            { label: "Relevance filter", value: String(platform.news.items?.length ?? 0) },
            { label: "Market linkage", value: platform.market.contextScore ?? "N/A" },
            { label: "Execution impact", value: platform.dashboard.summary?.readiness ?? "N/A" },
          ],
        }}
      />
      <NewsGridSection eyebrow="News layer" title="Relevance-filtered coverage" lead="SignalPulse only surfaces news when it contributes to market understanding or decision quality." items={items} />
      <CTASection
        title="Stay informed without switching into headline noise."
        description="The news layer is there to preserve context, not compete with the intelligence and execution layers."
        primary={{ label: "Open Dashboard", to: "/dashboard" }}
        secondary={{ label: "Read Docs", to: "/docs" }}
      />
    </>
  );
}



