import type { ReactNode } from "react";
import cx from "../../lib/cx";

type PageContainerProps = {
  className?: string;
  children: ReactNode;
};

export default function PageContainer({ className, children }: PageContainerProps) {
  return <div className={cx("page-container", className)}>{children}</div>;
}


