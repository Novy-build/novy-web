import type { User } from '@domain/entities/user';
import type { UserDTO } from '../dto/user.dto';

export function mapUserDtoToEntity(dto: UserDTO): User {
  return { id: dto.id, displayName: dto.displayName, email: dto.email };
}

export function mapUserToDto(user: User): UserDTO {
  return { id: user.id, displayName: user.displayName, email: user.email };
}
