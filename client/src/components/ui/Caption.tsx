import type { ReactNode } from "react";
import cx from "../../lib/cx";

type CaptionProps = {
  className?: string;
  children: ReactNode;
};

export default function Caption({ className, children }: CaptionProps) {
  return <span className={cx("caption", className)}>{children}</span>;
}
