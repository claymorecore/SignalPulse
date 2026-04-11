import type { ReactNode } from "react";
import cx from "../../lib/cx";

type ButtonGroupProps = {
  className?: string;
  children: ReactNode;
};

export default function ButtonGroup({ className, children }: ButtonGroupProps) {
  return <div className={cx("button-group", className)}>{children}</div>;
}


