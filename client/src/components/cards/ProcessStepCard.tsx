import Card from "./Card";

type ProcessStepCardProps = {
  step: number;
  title: string;
  description: string;
};

export default function ProcessStepCard({ step, title, description }: ProcessStepCardProps) {
  return (
    <Card variant="tertiary">
      <span className="badge">Step {step}</span>
      <div className="card__header">
        <h3 className="card__title">{title}</h3>
        <p className="card__description">{description}</p>
      </div>
    </Card>
  );
}


