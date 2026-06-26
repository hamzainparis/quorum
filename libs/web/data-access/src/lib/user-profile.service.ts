import { Injectable, signal } from '@angular/core';

export interface UserProfile {
  name: string;
  email?: string;
  picture?: string;
}

const STORAGE_KEY = 'quorum:user-profile';

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly _profile = signal<UserProfile | null>(this.load());
  readonly profile = this._profile.asReadonly();

  save(profile: UserProfile): void {
    this._profile.set({ ...profile });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch { /* localStorage unavailable */ }
  }

  clear(): void {
    this._profile.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* localStorage unavailable */ }
  }

  private load(): UserProfile | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserProfile>;
        if (parsed.name) return { name: parsed.name, email: parsed.email, picture: parsed.picture };
      }
    } catch { /* localStorage unavailable */ }
    return null;
  }
}
