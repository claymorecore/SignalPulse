import type { ReactNode } from "react";
import cx from "../../lib/cx";

type CTAGroupProps = {
  className?: string;
  children: ReactNode;
};

export default function CTAGroup({ className, children }: CTAGroupProps) {
  return <div className={cx("cta-group", className)}>{children}</div>;
}


