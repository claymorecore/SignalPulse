import type { ReactNode } from "react";
import cx from "../../lib/cx";

type ContentColumnProps = {
  className?: string;
  children: ReactNode;
};

export default function ContentColumn({ className, children }: ContentColumnProps) {
  return <div className={cx("content-column", className)}>{children}</div>;
}


