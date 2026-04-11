import MediaFrame from "./MediaFrame";

type ProductPreviewProps = {
  title: string;
  chips?: string[];
  rows?: Array<{ label: string; value: string }>;
};

export default function ProductPreview({ title, chips = [], rows = [] }: ProductPreviewProps) {
  return (
    <MediaFrame>
      <div className="product-preview">
        <div className="preview-panel">
          <div className="preview-panel__row">
            <strong>{title}</strong>
            <span className="status-pill">
              <span className="status-pill__dot" />
              Live
            </span>
          </div>
          <div className="preview-chip-row">
            {chips.map((chip) => (
              <span key={chip} className="preview-chip">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="preview-panel preview-table">
          {rows.map((row) => (
            <div key={row.label} className="preview-table__row">
              <span>{row.label}</span>
              <div style={{ width: "46%" }}>
                <div className="preview-bar">
                  <span style={{ width: row.value }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MediaFrame>
  );
}


