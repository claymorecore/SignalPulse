import PageContainer from "../layout/PageContainer";
import Section from "../layout/Section";
import SectionHeader from "../layout/SectionHeader";
import Grid from "../layout/Grid";
import FeatureCard from "../cards/FeatureCard";
import CTAGroup from "../ui/CTAGroup";
import Button from "../ui/Button";
import type { CtaPair, FeatureItem } from "../../types/content";

type SystemOverviewSectionProps = {
  eyebrow: string;
  title: string;
  lead: string;
  items: FeatureItem[];
  cta?: CtaPair;
};

export default function SystemOverviewSection({ eyebrow, title, lead, items, cta }: SystemOverviewSectionProps) {
  return (
    <Section>
      <PageContainer>
        <SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
        <Grid columns={3}>
          {items.map((item) => (
            <FeatureCard key={item.title} {...item} />
          ))}
        </Grid>
        {cta ? (
          <CTAGroup className="u-mt-8">
            <Button to={cta.primary.to} variant="primary">
              {cta.primary.label}
            </Button>
            <Button to={cta.secondary.to} variant="secondary">
              {cta.secondary.label}
            </Button>
          </CTAGroup>
        ) : null}
      </PageContainer>
    </Section>
  );
}



