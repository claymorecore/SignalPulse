import type { ReactNode } from "react";

type NavGroupProps = {
  label: string;
  children: ReactNode;
};

export default function NavGroup({ label, children }: NavGroupProps) {
  return (
    <div className="nav-group" aria-label={label}>
      {children}
    </div>
  );
}
