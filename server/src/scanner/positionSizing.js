export const FIXED_POSITION_USD = 1000;

export const resolveFixedPosition = (entry) => {
  const price = Number(entry);

  if (!Number.isFinite(price) || price <= 0) {
    return {
      capitalUsd: FIXED_POSITION_USD,
      qty: NaN
    };
  }

  return {
    capitalUsd: FIXED_POSITION_USD,
    qty: FIXED_POSITION_USD / price
  };
};

export default {
  FIXED_POSITION_USD,
  resolveFixedPosition
};