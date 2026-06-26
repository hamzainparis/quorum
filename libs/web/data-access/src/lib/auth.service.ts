import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { GoogleProfile } from '@quorum/shared-domain';
import { firstValueFrom } from 'rxjs';
import { QUORUM_APP_CONFIG } from './app-config.token';

interface GoogleCredentialResponse {
  credential: string;
}

interface GooglePromptMomentNotification {
  isNotDisplayed(): boolean;
  isSkippedMoment(): boolean;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
  }): void;
  prompt(listener?: (notification: GooglePromptMomentNotification) => void): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(QUORUM_APP_CONFIG);
  private initialized = false;
  private pendingResolve: ((profile: GoogleProfile) => void) | null = null;
  private pendingReject: ((err: Error) => void) | null = null;

  signInWithGoogle(): Promise<GoogleProfile> {
    if (!this.config.googleClientId) {
      return Promise.reject(new Error('Google sign-in is not configured for this deployment.'));
    }
    const accountsId = window.google?.accounts?.id;
    if (!accountsId) {
      return Promise.reject(new Error('Google sign-in is still loading. Try again in a moment.'));
    }

    this.ensureInitialized(accountsId);

    return new Promise<GoogleProfile>((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;
      accountsId.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          reject(new Error('Google sign-in was dismissed.'));
        }
      });
    });
  }

  private ensureInitialized(accountsId: GoogleAccountsId): void {
    if (this.initialized) return;
    accountsId.initialize({
      client_id: this.config.googleClientId,
      callback: (response) => {
        this.verifyToken(response.credential).then(
          (profile) => this.pendingResolve?.(profile),
          (err) => this.pendingReject?.(err)
        );
      },
    });
    this.initialized = true;
  }

  private verifyToken(idToken: string): Promise<GoogleProfile> {
    return firstValueFrom(
      this.http.post<GoogleProfile>(`${this.config.apiUrl}/auth/google`, { idToken })
    );
  }
}
