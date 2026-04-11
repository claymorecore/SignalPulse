import CTAGroup from "../ui/CTAGroup";
import Button from "../ui/Button";
import Eyebrow from "../ui/Eyebrow";
import Heading from "../ui/Heading";
import Lead from "../ui/Lead";
import PageContainer from "../layout/PageContainer";
import Section from "../layout/Section";
import SectionInner from "../layout/SectionInner";
import SplitLayout from "../layout/SplitLayout";
import ProductPreview from "../ui/ProductPreview";
import StatusPill from "../feedback/StatusPill";
import Badge from "../feedback/Badge";
import Cluster from "../layout/Cluster";
import type { HeroContent } from "../../types/content";

type HeroSectionProps = {
  content: HeroContent;
};

export default function HeroSection({ content }: HeroSectionProps) {
  return (
    <Section className="page-hero">
      <PageContainer>
        <SectionInner>
          <SplitLayout>
            <div className="stack">
              <Eyebrow>{content.eyebrow}</Eyebrow>
              <Heading level={1} hero>
                {content.title}
              </Heading>
              <Lead>{content.description}</Lead>
              <Cluster className="hero-meta">
                <StatusPill>{content.status}</StatusPill>
                {content.tags.map((tag: string) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </Cluster>
              <CTAGroup>
                <Button to={content.primaryCta.to} variant="primary">
                  {content.primaryCta.label}
                </Button>
                <Button to={content.secondaryCta.to} variant="secondary">
                  {content.secondaryCta.label}
                </Button>
              </CTAGroup>
            </div>
            <ProductPreview title={content.previewTitle} chips={content.previewChips} rows={content.previewRows} />
          </SplitLayout>
        </SectionInner>
      </PageContainer>
    </Section>
  );
}



