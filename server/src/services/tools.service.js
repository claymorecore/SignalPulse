import { z } from "zod";

const positiveNumber = z.coerce.number().finite().positive();

const round = (value, precision = 2) =>
  Number.isFinite(value) ? Number(value.toFixed(precision)) : 0;

const riskSchema = z.object({
  entry: positiveNumber,
  stop: positiveNumber,
  target: positiveNumber
});

const positionSizeSchema = z.object({
  accountSize: positiveNumber,
  riskPercent: positiveNumber.max(100),
  entry: positiveNumber,
  stop: positiveNumber
});

const rrSchema = z.object({
  reward: positiveNumber,
  risk: positiveNumber
});

export const calculateRisk = (payload) => {
  const { entry, stop, target } = riskSchema.parse(payload);
  const riskPerUnit = Math.abs(entry - stop);
  const rewardPerUnit = Math.abs(target - entry);
  const rr = rewardPerUnit / riskPerUnit;

  return {
    riskPerUnit: round(riskPerUnit, 4),
    rewardPerUnit: round(rewardPerUnit, 4),
    riskRewardRatio: round(rr, 2)
  };
};

export const calculatePositionSize = (payload) => {
  const { accountSize, riskPercent, entry, stop } = positionSizeSchema.parse(payload);
  const riskAmount = accountSize * (riskPercent / 100);
  const stopDistance = Math.abs(entry - stop);
  const quantity = stopDistance > 0 ? riskAmount / stopDistance : 0;

  return {
    riskAmount: round(riskAmount, 2),
    stopDistance: round(stopDistance, 4),
    quantity: round(quantity, 6)
  };
};

export const calculateRiskReward = (payload) => {
  const { reward, risk } = rrSchema.parse(payload);

  return {
    reward: round(reward, 2),
    risk: round(risk, 2),
    ratio: round(reward / risk, 2)
  };
};
