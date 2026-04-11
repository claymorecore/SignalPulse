import Card from "./Card";
import IconBlock from "../ui/IconBlock";
import List from "../ui/List";

type LayerCardProps = {
  icon: string;
  title: string;
  question: string;
  bullets: string[];
};

export default function LayerCard({ icon, title, question, bullets }: LayerCardProps) {
  return (
    <Card>
      <IconBlock type={icon} />
      <div className="card__header">
        <h3 className="card__title">{title}</h3>
        <p className="card__meta">{question}</p>
      </div>
      <List items={bullets} />
    </Card>
  );
}


