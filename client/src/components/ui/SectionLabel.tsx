import type { ReactNode } from "react";

type SectionLabelProps = {
  children: ReactNode;
};

export default function SectionLabel({ children }: SectionLabelProps) {
  return <span className="section-label">{children}</span>;
}
