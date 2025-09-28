/**
 * Derives a deterministic index from a string input
 * Used for generating consistent account indices for account abstraction
 */
export function deriveIndexFromString(input: string): number {
  // Simple hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Return positive number and use modulo to keep it reasonable
  return Math.abs(hash) % 1000000;
}
