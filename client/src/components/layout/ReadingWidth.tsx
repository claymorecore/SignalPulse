import type { ReactNode } from "react";
import cx from "../../lib/cx";

type ReadingWidthProps = {
  className?: string;
  children: ReactNode;
};

export default function ReadingWidth({ className, children }: ReadingWidthProps) {
  return <div className={cx("reading-width", className)}>{children}</div>;
}


