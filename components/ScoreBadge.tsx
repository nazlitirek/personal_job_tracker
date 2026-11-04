export function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span className="score score-none" title="Add your CV to see a match percentage">
        –
      </span>
    );
  }
  const tone = score >= 70 ? "score-high" : score >= 45 ? "score-mid" : "score-low";
  return (
    <span className={`score ${tone}`} title="How well this job matches your CV">
      {score}%
    </span>
  );
}
