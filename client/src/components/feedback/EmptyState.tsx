type EmptyStateProps = {
  title: string;
  description: string;
};

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p className="card__description">{description}</p>
    </div>
  );
}


