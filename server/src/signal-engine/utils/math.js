export const average = (values) => {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const percentageChange = (from, to) => {
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return 0;
  return ((to - from) / from) * 100;
};

export const stdDev = (values) => {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  const mean = average(valid);
  const variance =
    valid.reduce((sum, value) => sum + (value - mean) ** 2, 0) / valid.length;
  return Math.sqrt(variance);
};

export const max = (values) => {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? Math.max(...valid) : 0;
};

export const min = (values) => {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? Math.min(...valid) : 0;
};
