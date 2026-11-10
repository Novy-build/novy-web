import type { UserDTO } from './user.dto';

/** 202 response when Supabase requires email confirmation before a session. */
export interface RegistrationPendingDTO {
  user: UserDTO;
  requiresEmailConfirmation: true;
}

export interface ApiErrorBodyDTO {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string | null;
}

/** Stable backend error envelope: `{ "error": { code, message, ... } }`. */
export interface ApiErrorEnvelopeDTO {
  error: ApiErrorBodyDTO;
}
