import type { ReactNode } from "react";
import cx from "../../lib/cx";
import ComponentErrorBoundary from "../feedback/ComponentErrorBoundary";

type MediaFrameProps = {
  className?: string;
  children: ReactNode;
};

export default function MediaFrame({ className, children }: MediaFrameProps) {
  return (
    <ComponentErrorBoundary
      name="MediaFrame"
      fallbackTitle="Media preview unavailable"
      fallbackDescription="SignalPulse could not render this media frame safely."
    >
      <div className={cx("media-frame", className)}>
        <div className="media-frame__inner">{children}</div>
      </div>
    </ComponentErrorBoundary>
  );
}


