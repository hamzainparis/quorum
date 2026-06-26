export interface GoogleProfile {
  name: string;
  email: string;
  picture?: string;
}

export interface VerifyGoogleTokenPayload {
  idToken: string;
}
