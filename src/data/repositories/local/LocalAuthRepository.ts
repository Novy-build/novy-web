import type { User } from '@domain/entities/user';
import { AuthError } from '@domain/errors/AuthError';
import type { AuthRepository, SignInInput, SignUpInput } from '@domain/repositories/auth.repository';
import { generateId } from '@domain/ids';
import type { UserAccountCollectionDTO, UserAccountDTO, UserDTO } from '../../dto/user.dto';
import { mapUserDtoToEntity, mapUserToDto } from '../../mappers/user.mapper';
import { removeKey, readJson, sleep, writeJson, type StorageLike } from '../../storage/storage';

const SESSION_KEY = 'novy.session.v1';
const USERS_KEY = 'novy.users.v1';
const DEFAULT_LATENCY_MS = 250;

const DEMO_USER: User = {
  id: 'user_demo',
  displayName: 'Demo User',
  email: 'demo@novy.app',
};

function accountEmailIsEqual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function mapAccountToUser(account: UserAccountDTO): User {
  return { id: account.id, displayName: account.displayName, email: account.email };
}

/**
 * Mock auth on localStorage. The session stores a plain profile (never a
 * token) so reloads keep users signed in during the frontend-only phase;
 * real sessions move to the HTTP layer in the backend phase.
 */
export class LocalAuthRepository implements AuthRepository {
  readonly supportsDemo = true;

  private readonly storage: StorageLike;
  private readonly delayMs: number;

  constructor(storage: StorageLike, options?: { delayMs?: number }) {
    this.storage = storage;
    this.delayMs = options?.delayMs ?? DEFAULT_LATENCY_MS;
  }

  async getSession(): Promise<User | null> {
    await sleep(this.delayMs);
    const dto = readJson<UserDTO>(this.storage, SESSION_KEY);
    return dto ? mapUserDtoToEntity(dto) : null;
  }

  async signIn(input: SignInInput): Promise<User> {
    await sleep(this.delayMs);
    const account = this.readAccounts().find((entry) => accountEmailIsEqual(entry.email, input.email));
    if (!account || account.password !== input.password) {
      // The backend deliberately returns one generic failure for unknown
      // emails and wrong passwords; mirror it so local development matches.
      throw new AuthError('invalid-credentials');
    }
    const user = mapAccountToUser(account);
    this.writeSession(user);
    return user;
  }

  async signUp(input: SignUpInput): Promise<User> {
    await sleep(this.delayMs);
    const accounts = this.readAccounts();
    const alreadyRegistered = accounts.some((entry) => accountEmailIsEqual(entry.email, input.email));
    if (alreadyRegistered) {
      throw new AuthError('email-taken');
    }

    const user: User = {
      id: generateId('user'),
      displayName: input.displayName.trim(),
      email: input.email.trim().toLowerCase(),
    };
    const account: UserAccountDTO = { ...user, password: input.password };
    writeJson(this.storage, USERS_KEY, { accounts: [...accounts, account] });
    this.writeSession(user);
    return user;
  }

  async signInDemoUser(): Promise<User> {
    await sleep(this.delayMs);
    this.writeSession(DEMO_USER);
    return DEMO_USER;
  }

  async signOut(): Promise<void> {
    await sleep(this.delayMs);
    removeKey(this.storage, SESSION_KEY);
  }

  private writeSession(user: User): void {
    writeJson(this.storage, SESSION_KEY, mapUserToDto(user));
  }

  private readAccounts(): UserAccountDTO[] {
    return readJson<UserAccountCollectionDTO>(this.storage, USERS_KEY)?.accounts ?? [];
  }
}
