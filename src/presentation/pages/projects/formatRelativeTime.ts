/**
 * Human "Edited 3m ago" copy for project cards, deterministic through the
 * injected clock so tests (and future SSR) never race wall time.
 */
export function formatRelativeTime(date: Date, now: Date): string {
  const elapsedSeconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));

  if (elapsedSeconds < 45) {
    return 'just now';
  }

  const minutes = Math.round(elapsedSeconds / 60);
  if (minutes < 60) {
    return `${Math.max(1, minutes)}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${Math.max(1, hours)}h ago`;
  }

  const days = Math.round(hours / 24);
  if (days < 30) {
    return `${Math.max(1, days)}d ago`;
  }

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
