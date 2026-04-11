import { navigationLinks } from "../../data/siteContent";
import NavLinkItem from "./NavLinkItem";

export default function NavLinks() {
  return (
    <nav className="nav-links" aria-label="Primary">
      {navigationLinks.map((link) => <NavLinkItem key={link.to} item={link} />)}
    </nav>
  );
}


