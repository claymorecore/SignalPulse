import PageContainer from "../layout/PageContainer";
import Section from "../layout/Section";
import MetricCard from "../cards/MetricCard";
import StatStrip from "../ui/StatStrip";

type StatMetric = {
  label: string;
  value: string;
  description: string;
};

type StatsStripSectionProps = {
  metrics: StatMetric[];
};

export default function StatsStripSection({ metrics }: StatsStripSectionProps) {
  return (
    <Section density="dense">
      <PageContainer>
        <StatStrip>
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </StatStrip>
      </PageContainer>
    </Section>
  );
}



