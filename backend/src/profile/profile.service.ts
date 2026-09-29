import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { ProfileDto, UpdateProfileDto } from './dto/profile.dto.js';
import {
  ProfilePatch,
  ProfileRow,
  ProfilesRepository,
} from './profiles.repository.js';

function toProfileDto(row: ProfileRow, email: string): ProfileDto {
  return {
    id: row.id,
    email,
    displayName: row.display_name,
    experienceLevel: row.experience_level,
    learningGoals: row.learning_goals,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@Injectable()
export class ProfileService {
  constructor(private readonly profiles: ProfilesRepository) {}

  async get(user: AuthUser): Promise<ProfileDto> {
    const row = await this.profiles.findById(user.accessToken, user.id);
    if (!row) throw new NotFoundException('Profile not found');
    return toProfileDto(row, user.email);
  }

  async update(user: AuthUser, dto: UpdateProfileDto): Promise<ProfileDto> {
    const patch: ProfilePatch = {};
    if (dto.displayName !== undefined) patch.display_name = dto.displayName;
    if (dto.experienceLevel !== undefined) {
      patch.experience_level = dto.experienceLevel;
    }
    if (dto.learningGoals !== undefined) {
      patch.learning_goals = dto.learningGoals;
    }

    if (Object.keys(patch).length === 0) return this.get(user);

    const row = await this.profiles.update(user.accessToken, user.id, patch);
    if (!row) throw new NotFoundException('Profile not found');
    return toProfileDto(row, user.email);
  }
}
