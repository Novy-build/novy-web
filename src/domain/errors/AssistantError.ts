export type AssistantErrorCode =
  | 'not-configured'
  | 'unavailable'
  | 'invalid-response'
  | 'invalid-proposal'
  | 'apply-failed'
  | 'knowledge-unavailable'
  | 'stale-revision'
  | 'validation'
  | 'feasibility-blocked'
  | 'session-expired'
  | 'rate-limited'
  | 'quota-exceeded'
  | 'network'
  | 'timeout'
  | 'unexpected';

export class AssistantError extends Error {
  readonly code: AssistantErrorCode;
  readonly details?: unknown;

  constructor(code: AssistantErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AssistantError';
    this.code = code;
    this.details = details;
  }
}
