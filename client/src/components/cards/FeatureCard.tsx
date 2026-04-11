import Card from "./Card";
import IconBlock from "../ui/IconBlock";

type FeatureCardProps = {
  icon: string;
  title: string;
  description: string;
  meta?: string;
};

export default function FeatureCard({ icon, title, description, meta }: FeatureCardProps) {
  return (
    <Card>
      <IconBlock type={icon} />
      <div className="card__header">
        <h3 className="card__title">{title}</h3>
        <p className="card__description">{description}</p>
      </div>
      {meta ? <p className="card__meta">{meta}</p> : null}
    </Card>
  );
}


