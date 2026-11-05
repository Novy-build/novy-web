/** DTO mirroring the future API user payload. */
export interface UserDTO {
  id: string;
  displayName: string;
  email: string;
}

/**
 * MOCK-ONLY account record so registration/login work without a backend.
 * Storing passwords in any form is scaffolding for the frontend-only phase
 * and is replaced wholesale by Supabase auth in the backend phase — the
 * presentation layer never reads this DTO, only the session user above.
 */
export interface UserAccountDTO {
  id: string;
  displayName: string;
  email: string;
  password: string;
}

export interface UserAccountCollectionDTO {
  accounts: UserAccountDTO[];
}
