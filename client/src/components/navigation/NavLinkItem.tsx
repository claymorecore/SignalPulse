import { NavLink } from "react-router-dom";
import type { LinkItem } from "../../types/content";

type NavLinkItemProps = {
  item: LinkItem;
  onClick?: () => void;
};

export default function NavLinkItem({ item, onClick }: NavLinkItemProps) {
  return (
    <NavLink to={item.to} className="nav-link" onClick={onClick}>
      {item.label}
    </NavLink>
  );
}
