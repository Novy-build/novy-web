/**
 * Readable, collision-proof ids across the domain layer.
 * NOT for anything security-sensitive; mock phase only.
 */
let sequence = 0;

export function generateId(prefix: string): string {
  sequence += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${sequence}_${random}`;
}
