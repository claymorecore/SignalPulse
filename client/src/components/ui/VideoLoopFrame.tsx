import MediaFrame from "./MediaFrame";

type VideoLoopFrameProps = {
  title: string;
  caption: string;
};

export default function VideoLoopFrame({ title, caption }: VideoLoopFrameProps) {
  return (
    <MediaFrame>
      <div className="product-preview">
        <div className="preview-panel">
          <div className="preview-panel__row">
            <strong>{title}</strong>
            <span className="preview-chip">Muted loop</span>
          </div>
          <p className="card__description">{caption}</p>
        </div>
        <div className="preview-panel">
          <div className="preview-bar">
            <span style={{ width: "72%" }} />
          </div>
          <div className="preview-panel__row" style={{ marginTop: "1rem" }}>
            <span>Market state</span>
            <span>Signal validation</span>
          </div>
          <div className="preview-panel__row">
            <span>Execution context</span>
            <span>Feedback loop</span>
          </div>
        </div>
      </div>
    </MediaFrame>
  );
}


