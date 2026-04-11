import type { ReactNode } from "react";
import cx from "../../lib/cx";

type GridProps = {
  columns?: number;
  className?: string;
  children: ReactNode;
};

export default function Grid({ columns = 3, className, children }: GridProps) {
  return <div className={cx("grid", `grid--${columns}`, className)}>{children}</div>;
}


