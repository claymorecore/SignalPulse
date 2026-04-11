export const buildSignalExplanation = ({
  symbol,
  timeframe,
  candidate,
  context,
  validation,
  score
}) => {
  const passedChecks = validation.checks
    .filter((check) => check.passed)
    .map((check) => check.key.replace(/-/g, " "));

  const failedChecks = validation.failedChecks.map((check) => check.message);

  return {
    thesis: `${symbol} on ${timeframe} is showing a ${candidate.setupType.replace(/_/g, " ")} with ${candidate.direction} direction in a ${context.trend} regime.`,
    whyNow: candidate.reasons.join(" "),
    whatInvalidates:
      candidate.direction === "long"
        ? `A loss of ${candidate.stopLoss.toFixed(4)} invalidates the current long structure.`
        : `A reclaim of ${candidate.stopLoss.toFixed(4)} invalidates the current short structure.`,
    whyItPassed: passedChecks.length
      ? `The setup passed validation on ${passedChecks.join(", ")}.`
      : "The setup did not pass validation strongly enough to surface cleanly.",
    riskNotes: failedChecks.length
      ? failedChecks
      : [
          `Confidence is ${score.confidenceScore.toFixed(0)} with a ${score.qualityTier} quality tier.`,
          `Targeting ${candidate.takeProfit.toFixed(4)} keeps the trade inside a ${candidate.rr.toFixed(2)} RR frame.`
        ]
  };
};

export default buildSignalExplanation;
