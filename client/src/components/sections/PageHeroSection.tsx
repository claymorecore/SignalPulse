import PageContainer from "../layout/PageContainer";
import Section from "../layout/Section";
import SectionInner from "../layout/SectionInner";
import SplitLayout from "../layout/SplitLayout";
import Eyebrow from "../ui/Eyebrow";
import Heading from "../ui/Heading";
import Lead from "../ui/Lead";
import CTAGroup from "../ui/CTAGroup";
import Button from "../ui/Button";
import ProductPreview from "../ui/ProductPreview";
import type { CtaLink, PageHeroPreview } from "../../types/content";

type PageHeroSectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  primary?: CtaLink;
  secondary?: CtaLink;
  preview: PageHeroPreview;
};

export default function PageHeroSection({ eyebrow, title, description, primary, secondary, preview }: PageHeroSectionProps) {
  return (
    <Section className="page-hero" density="dense">
      <PageContainer>
        <SectionInner>
          <SplitLayout>
            <div className="stack">
              <Eyebrow>{eyebrow}</Eyebrow>
              <Heading level={1}>{title}</Heading>
              <Lead>{description}</Lead>
              {(primary || secondary) ? (
                <CTAGroup>
                  {primary ? (
                    <Button to={primary.to} variant="primary">
                      {primary.label}
                    </Button>
                  ) : null}
                  {secondary ? (
                    <Button to={secondary.to} variant="secondary">
                      {secondary.label}
                    </Button>
                  ) : null}
                </CTAGroup>
              ) : null}
            </div>
            <ProductPreview {...preview} />
          </SplitLayout>
        </SectionInner>
      </PageContainer>
    </Section>
  );
}



