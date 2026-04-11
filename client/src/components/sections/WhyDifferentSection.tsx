import PageContainer from "../layout/PageContainer";
import Section from "../layout/Section";
import SectionHeader from "../layout/SectionHeader";
import Surface from "../layout/Surface";
import ComparisonRow from "../cards/ComparisonRow";
import type { ComparisonItem } from "../../types/content";

type WhyDifferentSectionProps = {
  eyebrow: string;
  title: string;
  lead: string;
  rows: ComparisonItem[];
};

export default function WhyDifferentSection({ eyebrow, title, lead, rows }: WhyDifferentSectionProps) {
  return (
    <Section>
      <PageContainer>
        <SectionHeader eyebrow={eyebrow} title={title} lead={lead} />
        <Surface>
          {rows.map((row) => (
            <ComparisonRow key={row.label} {...row} />
          ))}
        </Surface>
      </PageContainer>
    </Section>
  );
}



