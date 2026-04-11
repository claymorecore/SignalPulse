import { QUALITY_TIERS } from "../types.js";
import { clamp } from "../utils/math.js";

const scoreTier = (score) => {
  if (score >= 80) return QUALITY_TIERS.A;
  if (score >= 67) return QUALITY_TIERS.B;
  if (score >= 60) return QUALITY_TIERS.C;
  return QUALITY_TIERS.SUPPRESSED;
};

export const scoreCandidate = ({ candidate, context, validation, config }) => {
  const contextScore = clamp(
    context.cleanlinessScore * 0.45 +
      Math.abs(context.directionalBias) * 4 +
      context.participationScore * 0.25,
    0,
    100
  );

  const structureScore = clamp(
    (candidate.reasons.length >= 2 ? 20 : 10) +
      (candidate.metrics.atr ? 15 : 0) +
      (candidate.setupType === "breakout" ? 8 : 5) +
      (candidate.setupType === "trend_continuation" ? 10 : 0),
    0,
    100
  );

  const riskRewardScore = clamp(candidate.rr * 25, 0, 100);
  const executionScore = clamp(
    60 +
      (validation.failedChecks.some((check) => check.key === "execution-distance") ? -30 : 0) +
      (context.volatilityRegime === "compressed" ? -12 : 8),
    0,
    100
  );

  const cleanlinessScore = clamp(context.cleanlinessScore, 0, 100);
  const confidenceModifier = validation.passed ? 6 : -25;
  const confidenceScore = clamp(
    contextScore * 0.28 +
      structureScore * 0.24 +
      executionScore * 0.2 +
      riskRewardScore * 0.18 +
      cleanlinessScore * 0.1 +
      confidenceModifier,
    0,
    100
  );

  const qualityTier = scoreTier(confidenceScore);

  return {
    confidenceScore: Number(confidenceScore.toFixed(2)),
    qualityTier,
    surfaced:
      validation.passed &&
      confidenceScore >= config.minConfidenceScore &&
      qualityTier !== QUALITY_TIERS.SUPPRESSED,
    breakdown: {
      contextScore: Number(contextScore.toFixed(2)),
      structureScore: Number(structureScore.toFixed(2)),
      executionScore: Number(executionScore.toFixed(2)),
      riskRewardScore: Number(riskRewardScore.toFixed(2)),
      cleanlinessScore: Number(cleanlinessScore.toFixed(2)),
      confidenceModifier
    }
  };
};

export default scoreCandidate;
