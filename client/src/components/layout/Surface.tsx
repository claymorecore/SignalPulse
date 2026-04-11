import type { ReactNode } from "react";
import cx from "../../lib/cx";

type SurfaceProps = {
  className?: string;
  soft?: boolean;
  children: ReactNode;
};

export default function Surface({ className, soft = false, children }: SurfaceProps) {
  return (
    <div className={cx("surface", "surface--panel", soft && "surface--soft", className)}>
      {children}
    </div>
  );
}


