import PageContainer from "../layout/PageContainer";
import Section from "../layout/Section";
import SectionHeader from "../layout/SectionHeader";
import ProcessStepCard from "../cards/ProcessStepCard";
import type { ProcessStep } from "../../types/content";

type HowItWorksSectionProps = {
  eyebrow: string;
  title: string;
  lead: string;
  steps: ProcessStep[];
};

export default function HowItWorksSection({ eyebrow, title, lead, steps }: HowItWorksSectionProps) {
  return (
    <Section density="dense">
      <PageContainer>
        <SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
        <div className="flow-grid">
          {steps.map((step, index) => (
            <ProcessStepCard key={step.title} step={index + 1} {...step} />
          ))}
        </div>
      </PageContainer>
    </Section>
  );
}



