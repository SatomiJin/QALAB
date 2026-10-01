import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ProfileModule } from '../profile/profile.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import {
  jwtKeySetProvider,
  JwtVerifierService,
} from './jwt-verifier.service.js';

@Module({
  imports: [ProfileModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    jwtKeySetProvider,
    JwtVerifierService,
    // Order matters: authenticate first, then check roles.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
