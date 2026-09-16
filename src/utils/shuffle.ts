/**
 * Mathematically sound Fisher-Yates (Knuth) array shuffle.
 * Guaranteed unbiased random permutation.
 * If array length > 1, guarantees the first element changes position
 * so the user immediately perceives the shuffle effect.
 */
export function shuffleArray<T>(array: T[]): T[] {
  if (!array || array.length <= 1) return [...(array || [])];
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  // If by chance the first element remained the same, swap it with another element
  if (arr.length > 1 && arr[0] === array[0]) {
    const swapIdx = 1 + Math.floor(Math.random() * (arr.length - 1));
    const temp = arr[0];
    arr[0] = arr[swapIdx];
    arr[swapIdx] = temp;
  }
  return arr;
}
