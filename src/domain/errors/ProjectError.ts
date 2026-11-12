export type ProjectErrorCode =
  | 'validation'
  | 'not-found'
  | 'already-exists'
  | 'stale-revision'
  | 'precondition-required'
  | 'session-expired'
  | 'rate-limited'
  | 'unavailable'
  | 'network'
  | 'unexpected';

/**
 * Typed project persistence failure raised by API-backed repositories.
 * The presentation layer maps codes to friendly copy instead of parsing raw
 * server strings.
 */
export class ProjectError extends Error {
  readonly code: ProjectErrorCode;
  readonly details?: unknown;

  constructor(code: ProjectErrorCode, message?: string, details?: unknown) {
    super(message ?? `ProjectError: ${code}`);
    this.name = 'ProjectError';
    this.code = code;
    this.details = details;
  }
}
