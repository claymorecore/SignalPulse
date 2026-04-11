import type { ReactNode } from "react";
import Eyebrow from "../ui/Eyebrow";
import Heading from "../ui/Heading";
import Lead from "../ui/Lead";
import cx from "../../lib/cx";

type SectionHeaderProps = {
  eyebrow?: ReactNode;
  title?: ReactNode;
  lead?: ReactNode;
  className?: string;
};

export default function SectionHeader({ eyebrow, title, lead, className }: SectionHeaderProps) {
  return (
    <div className={cx("section-header", className)}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      {title ? <Heading level={2}>{title}</Heading> : null}
      {lead ? <Lead>{lead}</Lead> : null}
    </div>
  );
}


