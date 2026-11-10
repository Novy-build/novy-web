/**
 * The demo shortcut is a local development convenience only. It must never be
 * offered by an API-backed repository or in a production build.
 */
export function isDemoLoginVisible(isDevelopment: boolean, supportsDemo: boolean): boolean {
  return isDevelopment && supportsDemo;
}
