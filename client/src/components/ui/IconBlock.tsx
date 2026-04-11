export default function IconBlock({ type = "grid" }) {
  const icons = {
    grid: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="4" width="6" height="6" rx="1.5" />
        <rect x="14" y="4" width="6" height="6" rx="1.5" />
        <rect x="4" y="14" width="6" height="6" rx="1.5" />
        <rect x="14" y="14" width="6" height="6" rx="1.5" />
      </svg>
    ),
    signal: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 16l5-5 4 4 7-8" />
        <path d="M17 7h3v3" />
      </svg>
    ),
    layers: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 4l8 4-8 4-8-4 8-4z" />
        <path d="M4 12l8 4 8-4" />
        <path d="M4 16l8 4 8-4" />
      </svg>
    ),
    docs: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M7 4h8l4 4v12H7z" />
        <path d="M15 4v4h4" />
      </svg>
    ),
    tools: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 5a4 4 0 0 0 5 5l-8 8a2 2 0 0 1-3-3z" />
        <path d="M5 19l3-3" />
      </svg>
    ),
    news: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 6h14v12H5z" />
        <path d="M8 10h8" />
        <path d="M8 14h5" />
      </svg>
    ),
  };

  return <span className="icon-block">{icons[type] ?? icons.grid}</span>;
}


