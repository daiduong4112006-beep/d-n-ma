/** Never round a session containing a mistake up to a perfect 100%. */
export function firstAttemptAccuracy(correct: number, total: number): number {
  if (total <= 0) return 0;
  if (correct >= total) return 100;
  return Math.max(0, Math.min(99.9, Math.round(correct / total * 1000) / 10));
}
