import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { GoogleProfile, VerifyGoogleTokenPayload } from '@quorum/shared-domain';
import { GoogleAuthService } from './google-auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly googleAuth: GoogleAuthService) {}

  @Post('google')
  async verifyGoogleToken(@Body() body: VerifyGoogleTokenPayload): Promise<GoogleProfile> {
    if (!body?.idToken || typeof body.idToken !== 'string') {
      throw new BadRequestException('idToken is required');
    }
    return this.googleAuth.verifyIdToken(body.idToken);
  }
}
