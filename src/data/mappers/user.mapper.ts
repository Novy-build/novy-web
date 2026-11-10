import type { User } from '@domain/entities/user';
import type { UserDTO } from '../dto/user.dto';

export function mapUserDtoToEntity(dto: UserDTO): User {
  return { id: dto.id, displayName: dto.displayName, email: dto.email };
}

export function mapUserToDto(user: User): UserDTO {
  return { id: user.id, displayName: user.displayName, email: user.email };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Runtime boundary check for untrusted API payloads. TypeScript types vanish
 * at runtime, so the data layer verifies the shape before mapping.
 */
export function parseUserDto(value: unknown): UserDTO {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.displayName !== 'string' ||
    typeof value.email !== 'string'
  ) {
    throw new Error('Invalid user payload received from the API.');
  }
  return { id: value.id, displayName: value.displayName, email: value.email };
}
