import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller.js';
import { ProfileService } from './profile.service.js';
import { ProfilesRepository } from './profiles.repository.js';

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, ProfilesRepository],
  exports: [ProfilesRepository],
})
export class ProfileModule {}
