import type { ReactNode } from "react";
import cx from "../../lib/cx";

type ClusterProps = {
  className?: string;
  children: ReactNode;
};

export default function Cluster({ className, children }: ClusterProps) {
  return <div className={cx("cluster", className)}>{children}</div>;
}
