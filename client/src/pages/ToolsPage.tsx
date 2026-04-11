import CTASection from "../components/sections/CTASection";
import PageHeroSection from "../components/sections/PageHeroSection";
import PageContainer from "../components/layout/PageContainer";
import Section from "../components/layout/Section";
import SectionHeader from "../components/layout/SectionHeader";
import Grid from "../components/layout/Grid";
import FeatureCard from "../components/cards/FeatureCard";
import { toolGuides } from "../data/siteContent";

export default function ToolsPage() {
  return (
    <>
      <PageHeroSection
        eyebrow="Execution support"
        title="Tools stay secondary to the decision system."
        description="Utilities are available when needed, but SignalPulse keeps them in support of market understanding and execution clarity."
        primary={{ label: "Open Dashboard", to: "/dashboard" }}
        secondary={{ label: "Read Docs", to: "/docs" }}
        preview={{
          title: "Toolset",
          chips: ["Position sizing", "Levels", "Conversions"],
          rows: [
            { label: "Sizing confidence", value: "62%" },
            { label: "Execution prep", value: "71%" },
            { label: "Risk bounds", value: "66%" },
          ],
        }}
      />
      <Section>
        <PageContainer>
          <SectionHeader eyebrow="Utilities" title="Focused support modules" lead="Every tool reduces friction around sizing, structure, or scenario planning." />
          <Grid columns={3}>
            {toolGuides.map((tool) => (
              <FeatureCard key={tool.title} {...tool} />
            ))}
          </Grid>
        </PageContainer>
      </Section>
      <CTASection
        title="Use tools in context, not in isolation."
        description="SignalPulse keeps calculators and utility panels subordinate to the core awareness and intelligence workflow."
        primary={{ label: "Open Market", to: "/market" }}
        secondary={{ label: "Open Learn", to: "/learn" }}
      />
    </>
  );
}



