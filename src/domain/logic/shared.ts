/** Minimal structural read-only membership so callers can pass a real Set or a custom lookup. */
export interface ReadonlySetLike<T> {
  has(value: T): boolean;
}
