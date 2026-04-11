import { Link } from "react-router-dom";
import Card from "./Card";
import IconBlock from "../ui/IconBlock";

type PageCardProps = {
  to: string;
  icon: string;
  title: string;
  description: string;
  preview?: string;
};

export default function PageCard({ to, icon, title, description, preview }: PageCardProps) {
  return (
    <Link to={to}>
      <Card variant={preview ? "primary" : "secondary"}>
        <IconBlock type={icon} />
        <div className="card__header">
          <h3 className="card__title">{title}</h3>
          <p className="card__description">{description}</p>
        </div>
        {preview ? <p className="card__meta">{preview}</p> : null}
      </Card>
    </Link>
  );
}


