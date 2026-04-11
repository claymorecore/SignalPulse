type ComparisonRowProps = {
  label: string;
  signalpulse: string;
  alternative: string;
};

export default function ComparisonRow({ label, signalpulse, alternative }: ComparisonRowProps) {
  return (
    <div className="comparison-row">
      <div className="comparison-row__label">{label}</div>
      <div className="comparison-row__value">{signalpulse}</div>
      <div className="comparison-row__value comparison-row__value--muted">{alternative}</div>
    </div>
  );
}


