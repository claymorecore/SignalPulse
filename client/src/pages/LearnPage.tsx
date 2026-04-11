import CTASection from "../components/sections/CTASection";
import PageHeroSection from "../components/sections/PageHeroSection";
import PageContainer from "../components/layout/PageContainer";
import Section from "../components/layout/Section";
import SectionHeader from "../components/layout/SectionHeader";
import Grid from "../components/layout/Grid";
import Card from "../components/cards/Card";
import { learnTracks } from "../data/siteContent";

export default function LearnPage() {
  return (
    <>
      <PageHeroSection
        eyebrow="Knowledge layer"
        title="Learn in progression, not through scattered articles."
        description="Learn is structured from beginner orientation to advanced strategy so the platform can teach without overwhelming."
        primary={{ label: "Read Docs", to: "/docs" }}
        secondary={{ label: "Open Market", to: "/market" }}
        preview={{
          title: "Learning paths",
          chips: ["Beginner", "Intermediate", "Advanced"],
          rows: [
            { label: "Orientation", value: "92%" },
            { label: "Signal literacy", value: "78%" },
            { label: "Execution models", value: "59%" },
          ],
        }}
      />
      <Section>
        <PageContainer>
          <SectionHeader eyebrow="Tracks" title="Step-based learning" lead="Each track builds on the last so users can grow into the system naturally." />
          <Grid columns={3}>
            {learnTracks.map((track) => (
              <Card key={track.title}>
                <div className="card__header">
                  <h3 className="card__title">{track.title}</h3>
                  <p className="card__description">{track.description}</p>
                </div>
                <p className="card__meta">{track.modules.join(" • ")}</p>
              </Card>
            ))}
          </Grid>
        </PageContainer>
      </Section>
      <CTASection
        title="Use knowledge to improve execution quality."
        description="Learning becomes useful when it feeds directly back into market interpretation and trade discipline."
        primary={{ label: "Open Signals", to: "/signals" }}
        secondary={{ label: "Read About", to: "/about" }}
      />
    </>
  );
}



