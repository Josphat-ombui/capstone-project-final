/**
 * Wilson score interval for a proportion, at 95% confidence (z = 1.96).
 * It stays inside 0 and 1 and behaves sensibly when a group has few batches.
 */
export function wilsonInterval(failures: number, batches: number, z = 1.96): [number, number] {
  if (batches <= 0) return [Number.NaN, Number.NaN];
  const proportion = failures / batches;
  const denominator = 1 + (z * z) / batches;
  const centre = (proportion + (z * z) / (2 * batches)) / denominator;
  const halfWidth = (z * Math.sqrt((proportion * (1 - proportion)) / batches + (z * z) / (4 * batches * batches))) / denominator;
  return [Math.max(0, centre - halfWidth), Math.min(1, centre + halfWidth)];
}
