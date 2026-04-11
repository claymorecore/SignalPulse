export const validateCandidate = ({ candidate, context, candles, config }) => {
  const checks = [];

  const addCheck = (key, passed, message) => {
    checks.push({ key, passed, message });
  };

  addCheck(
    "data-completeness",
    Array.isArray(candles) && candles.length >= config.minCandles,
    `Requires at least ${config.minCandles} candles of normalized data.`
  );

  addCheck(
    "rr",
    Number.isFinite(candidate.rr) && candidate.rr >= config.minRR,
    `Risk/reward must be at least ${config.minRR.toFixed(1)}.`
  );

  const stopDistance = Math.abs(candidate.entry - candidate.stopLoss);
  addCheck(
    "execution-distance",
    Number.isFinite(stopDistance) && stopDistance > 0,
    "Entry and stop must form a valid execution structure."
  );

  addCheck(
    "context-fit",
    context.cleanliness !== "noisy" || context.cleanlinessScore >= config.suppression.rejectNoisyContextBelow,
    "Noisy environments suppress otherwise valid detections."
  );

  addCheck(
    "directional-clarity",
    Math.abs(context.directionalBias) >= config.suppression.rejectWeakDirectionalBiasBelow / 10 ||
      (context.trend === "neutral" ? candidate.setupType === "breakout" : true),
    "Directional clarity must support the setup being surfaced."
  );

  return {
    passed: checks.every((check) => check.passed),
    checks,
    failedChecks: checks.filter((check) => !check.passed)
  };
};

export default validateCandidate;
