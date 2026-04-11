import CTASection from "../components/sections/CTASection";
import PageHeroSection from "../components/sections/PageHeroSection";
import PageContainer from "../components/layout/PageContainer";
import Section from "../components/layout/Section";
import Grid from "../components/layout/Grid";
import FeatureCard from "../components/cards/FeatureCard";
import { aboutPrinciples } from "../data/siteContent";

export default function AboutPage() {
  return (
    <>
      <PageHeroSection
        eyebrow="About SignalPulse"
        title="A product philosophy built around structured crypto decisions."
        description="SignalPulse exists to reduce cognitive load, improve orientation, and help users move from raw information to clearer action."
        primary={{ label: "Open Home", to: "/" }}
        secondary={{ label: "Read Learn", to: "/learn" }}
        preview={{
          title: "Platform principles",
          chips: ["Clarity", "Structure", "Trust"],
          rows: [
            { label: "Information discipline", value: "88%" },
            { label: "System coherence", value: "81%" },
            { label: "Execution support", value: "67%" },
          ],
        }}
      />
      <Section>
        <PageContainer>
          <Grid columns={3}>
            {aboutPrinciples.map((principle) => (
              <FeatureCard key={principle.title} {...principle} />
            ))}
          </Grid>
        </PageContainer>
      </Section>
      <CTASection
        title="The platform is designed to guide, not pressure."
        description="SignalPulse is not a hype layer, a content machine, or an exchange clone. It is a decision system with clear boundaries."
        primary={{ label: "Open Market", to: "/market" }}
        secondary={{ label: "Open Docs", to: "/docs" }}
      />
    </>
  );
}



