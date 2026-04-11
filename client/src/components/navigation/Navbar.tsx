import { Link } from "react-router-dom";
import { useCallback, useState } from "react";
import NavLinks from "./NavLinks";
import MobileNav from "./MobileNav";
import Button from "../ui/Button";
import StatusPill from "../feedback/StatusPill";
import { navigationLinks } from "../../data/siteContent";

type NavbarProps = {
  status?: string;
};

export default function Navbar({ status }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobileNav = useCallback(() => setMobileOpen(false), []);
  const toggleMobileNav = useCallback(() => setMobileOpen((current) => !current), []);

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link to="/" className="brand" aria-label="SignalPulse home">
          <span className="brand__mark" />
          <span>SignalPulse</span>
        </Link>
        <div className="navbar__actions">
          <NavLinks />
          <StatusPill>{status ?? "Monitoring"}</StatusPill>
          <Button to="/dashboard" variant="primary">
            Open Dashboard
          </Button>
          <button
            type="button"
            className="mobile-nav-toggle u-hidden-desktop"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label="Toggle navigation"
            onClick={toggleMobileNav}
          >
            Menu
          </button>
        </div>
      </div>
      <MobileNav links={navigationLinks} open={mobileOpen} onClose={closeMobileNav} />
    </header>
  );
}


