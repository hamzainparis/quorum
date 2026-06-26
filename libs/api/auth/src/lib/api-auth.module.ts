import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { GoogleAuthService } from './google-auth.service';

@Module({
  controllers: [AuthController],
  providers: [GoogleAuthService],
  exports: [GoogleAuthService],
})
export class ApiAuthModule {}
