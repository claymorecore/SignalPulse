import type { ReactNode } from "react";
import cx from "../../lib/cx";

type TextProps = {
  className?: string;
  children: ReactNode;
};

export default function Text({ className, children }: TextProps) {
  return <p className={cx("text", className)}>{children}</p>;
}
