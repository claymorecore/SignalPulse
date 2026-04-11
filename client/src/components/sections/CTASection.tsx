import CTAGroup from "../ui/CTAGroup";
import Button from "../ui/Button";
import PageContainer from "../layout/PageContainer";
import Section from "../layout/Section";
import Surface from "../layout/Surface";
import Heading from "../ui/Heading";
import Lead from "../ui/Lead";
import type { CtaLink } from "../../types/content";

type CTASectionProps = {
  title: string;
  description: string;
  primary: CtaLink;
  secondary: CtaLink;
};

export default function CTASection({ title, description, primary, secondary }: CTASectionProps) {
  return (
    <Section density="break">
      <PageContainer>
        <Surface soft>
          <div className="cta-banner">
            <div className="stack">
              <Heading level={2}>{title}</Heading>
              <Lead>{description}</Lead>
            </div>
            <CTAGroup>
              <Button to={primary.to} variant="primary">
                {primary.label}
              </Button>
              <Button to={secondary.to} variant="secondary">
                {secondary.label}
              </Button>
            </CTAGroup>
          </div>
        </Surface>
      </PageContainer>
    </Section>
  );
}



