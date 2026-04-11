import Button from "../ui/Button";

type ErrorFallbackProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function ErrorFallback({
  title = "Something went wrong",
  description = "This part of SignalPulse could not be rendered safely. You can retry or continue navigating the platform.",
  actionLabel = "Reload",
  onAction,
}: ErrorFallbackProps) {
  return (
    <div className="error-fallback surface surface--panel" role="alert">
      <strong>{title}</strong>
      <p className="card__description">{description}</p>
      {onAction ? (
        <button type="button" className="button button--secondary" onClick={onAction}>
          {actionLabel}
        </button>
      ) : (
        <Button to="/" variant="secondary">
          Return Home
        </Button>
      )}
    </div>
  );
}
