import Card from "./Card";

type MetricCardProps = {
  label: string;
  value: string;
  description: string;
};

export default function MetricCard({ label, value, description }: MetricCardProps) {
  return (
    <Card variant="tertiary" className="metric-card">
      <span className="card__meta">{label}</span>
      <div className="metric-card__value">{value}</div>
      <p className="card__description">{description}</p>
    </Card>
  );
}


