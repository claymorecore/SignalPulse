import type { ReactNode } from "react";
import cx from "../../lib/cx";

type StatStripProps = {
  className?: string;
  children: ReactNode;
};

export default function StatStrip({ className, children }: StatStripProps) {
  return <div className={cx("stats-strip", className)}>{children}</div>;
}
