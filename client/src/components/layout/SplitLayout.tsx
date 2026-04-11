import type { ReactNode } from "react";
import cx from "../../lib/cx";

type SplitLayoutProps = {
  className?: string;
  children: ReactNode;
};

export default function SplitLayout({ className, children }: SplitLayoutProps) {
  return <div className={cx("split-layout", className)}>{children}</div>;
}


