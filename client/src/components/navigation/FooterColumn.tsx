import { Link } from "react-router-dom";
import type { FooterGroup } from "../../types/content";

type FooterColumnProps = {
  group: FooterGroup;
};

export default function FooterColumn({ group }: FooterColumnProps) {
  return (
    <div>
      <h3 className="footer__title">{group.title}</h3>
      <ul className="footer__list">
        {group.links.map((link) => (
          <li key={link.label}>
            <Link to={link.to}>{link.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
