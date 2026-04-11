import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import type { LinkItem } from "../../types/content";
import NavLinkItem from "./NavLinkItem";
import Button from "../ui/Button";

type MobileNavProps = {
  links: LinkItem[];
  open: boolean;
  onClose: () => void;
};

export default function MobileNav({ links, open, onClose }: MobileNavProps) {
  const location = useLocation();

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) onClose();
  }, [location.pathname, onClose, open]);

  return (
    <div className={`mobile-nav${open ? " mobile-nav--open" : ""}`} aria-hidden={!open}>
      <div className="mobile-nav__backdrop" onClick={onClose} />
      <div className="mobile-nav__panel surface surface--panel" id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Mobile navigation">
        <div className="mobile-nav__links">
          {links.map((link) => (
            <div key={link.to}>
              <NavLinkItem item={link} onClick={onClose} />
            </div>
          ))}
        </div>
        <Button to="/dashboard" variant="primary" onClick={onClose}>
          Open Dashboard
        </Button>
      </div>
    </div>
  );
}
