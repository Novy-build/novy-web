export type ExportErrorCode =
  | 'validation'
  | 'generation'
  | 'timeout'
  | 'rate-limited'
  | 'session-expired'
  | 'unavailable'
  | 'network'
  | 'unexpected';

/** Typed source-export failure exposed by the data layer. */
export class ExportError extends Error {
  readonly code: ExportErrorCode;

  constructor(code: ExportErrorCode, message?: string) {
    super(message ?? `ExportError: ${code}`);
    this.name = 'ExportError';
    this.code = code;
  }
}
