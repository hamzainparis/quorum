import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service';

const verifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken })),
}));

function configWith(clientId: string | undefined): ConfigService {
  return { get: () => clientId } as unknown as ConfigService;
}

describe('GoogleAuthService', () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it('rejects when GOOGLE_CLIENT_ID is not configured', async () => {
    const service = new GoogleAuthService(configWith(undefined));
    await expect(service.verifyIdToken('token')).rejects.toThrow(InternalServerErrorException);
  });

  it('returns the profile for a valid token', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        name: 'Alex Rivera',
        email: 'alex@example.com',
        picture: 'https://example.com/pic.png',
      }),
    });
    const service = new GoogleAuthService(configWith('client-id'));
    const profile = await service.verifyIdToken('token');
    expect(profile).toEqual({
      name: 'Alex Rivera',
      email: 'alex@example.com',
      picture: 'https://example.com/pic.png',
    });
  });

  it('rejects an invalid or expired token', async () => {
    verifyIdToken.mockRejectedValue(new Error('bad token'));
    const service = new GoogleAuthService(configWith('client-id'));
    await expect(service.verifyIdToken('token')).rejects.toThrow(UnauthorizedException);
  });

  it('rejects a payload missing required fields', async () => {
    verifyIdToken.mockResolvedValue({ getPayload: () => ({ email: 'alex@example.com' }) });
    const service = new GoogleAuthService(configWith('client-id'));
    await expect(service.verifyIdToken('token')).rejects.toThrow(UnauthorizedException);
  });
});
