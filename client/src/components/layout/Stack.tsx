import type { ReactNode } from "react";
import cx from "../../lib/cx";

type StackProps = {
  className?: string;
  children: ReactNode;
};

export default function Stack({ className, children }: StackProps) {
  return <div className={cx("stack", className)}>{children}</div>;
}


