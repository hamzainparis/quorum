import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { GoogleProfile } from '@quorum/shared-domain';

@Injectable()
export class GoogleAuthService {
  private readonly client: OAuth2Client;
  private readonly clientId: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    this.client = new OAuth2Client(this.clientId);
  }

  async verifyIdToken(idToken: string): Promise<GoogleProfile> {
    if (!this.clientId) {
      throw new InternalServerErrorException(
        'Google sign-in is not configured on this server (missing GOOGLE_CLIENT_ID)'
      );
    }

    let payload;
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience: this.clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google credential');
    }

    if (!payload?.email || !payload?.name) {
      throw new UnauthorizedException('Google credential is missing required profile fields');
    }

    return {
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
    };
  }
}
