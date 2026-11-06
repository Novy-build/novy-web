/**
 * Derives a 1-2 character initials string from a display name for use in
 * the sidebar avatar chip. Mirrors the n8n account chip behavior.
 *
 *   "Demo User" -> "DU"
 *   "Calexx"    -> "CA"
 *   "a"         -> "A"
 *   ""          -> "—"
 */
export function userInitials(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim();
  if (trimmed.length === 0) {
    return '—';
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  const single = parts[0];
  if (single.length >= 2) {
    return single.slice(0, 2).toUpperCase();
  }
  return single.charAt(0).toUpperCase();
}
