export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="score score-none" title="Add your CV to see a match percentage">
        <span>–</span>
      </span>
    );
  }
  const tone = score >= 70 ? "score-high" : score >= 45 ? "score-mid" : "score-low";
  return (
    <span
      className={`score ${tone}`}
      style={{ "--pct": score } as React.CSSProperties}
      title="How well this job matches your CV"
    >
      <span>{score}%</span>
    </span>
  );
}
