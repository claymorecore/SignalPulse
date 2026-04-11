import type { ReactNode } from "react";
import cx from "../../lib/cx";

type SectionInnerProps = {
  className?: string;
  children: ReactNode;
};

export default function SectionInner({ className, children }: SectionInnerProps) {
  return <div className={cx("section-inner", className)}>{children}</div>;
}
