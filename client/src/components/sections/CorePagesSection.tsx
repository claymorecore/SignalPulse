import PageContainer from "../layout/PageContainer";
import Section from "../layout/Section";
import SectionHeader from "../layout/SectionHeader";
import Grid from "../layout/Grid";
import PageCard from "../cards/PageCard";
import CTAGroup from "../ui/CTAGroup";
import Button from "../ui/Button";
import type { CtaPair, PageCardItem } from "../../types/content";

type CorePagesSectionProps = {
  eyebrow: string;
  title: string;
  lead: string;
  pages: PageCardItem[];
  cta?: CtaPair;
};

export default function CorePagesSection({ eyebrow, title, lead, pages, cta }: CorePagesSectionProps) {
  return (
    <Section>
      <PageContainer>
        <SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
        <Grid columns={3}>
          {pages.map((page) => (
            <PageCard key={page.to} {...page} />
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



