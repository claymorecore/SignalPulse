import type { ReactNode } from "react";

type LoadingStateProps = {
  title?: string;
  description?: string;
  children?: ReactNode;
};

export default function LoadingState({
  title = "Loading section",
  description = "SignalPulse is preparing the next view.",
  children,
}: LoadingStateProps) {
  return (
    <div className="loading-state surface surface--panel" role="status" aria-live="polite">
      <div className="loading-state__copy">
        <strong>{title}</strong>
        <p className="card__description">{description}</p>
      </div>
      {children ? children : <div className="loading-state__skeleton" aria-hidden="true" />}
    </div>
  );
}
