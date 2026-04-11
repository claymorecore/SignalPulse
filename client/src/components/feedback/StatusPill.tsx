export default function StatusPill({ children }) {
  return (
    <span className="status-pill">
      <span className="status-pill__dot" />
      {children}
    </span>
  );
}


