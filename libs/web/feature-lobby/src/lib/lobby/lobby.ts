import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { AuthService, ClientIdService, RoomSocketService, UserProfileService } from '@quorum/web-data-access';

@Component({
  selector: 'qrm-lobby',
  templateUrl: './lobby.html',
  styleUrl: './lobby.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Lobby {
  private readonly clientId = inject(ClientIdService);
  private readonly roomSocket = inject(RoomSocketService);
  private readonly auth = inject(AuthService);
  private readonly userProfile = inject(UserProfileService);

  roomCode = input.required<string>();

  readonly nameDraft = signal('');
  readonly googlePending = signal(false);
  readonly errorMessage = signal<string | null>(null);

  onNameInput(event: Event): void {
    this.nameDraft.set((event.target as HTMLInputElement).value);
  }

  onNameKey(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.join();
    }
  }

  join(): void {
    const name = this.nameDraft().trim() || 'Guest';
    this.userProfile.save({ name });
    this.roomSocket.join({
      roomCode: this.roomCode(),
      clientId: this.clientId.getOrCreate(),
      name,
    });
  }

  async googleSignIn(): Promise<void> {
    this.errorMessage.set(null);
    this.googlePending.set(true);
    try {
      const profile = await this.auth.signInWithGoogle();
      this.userProfile.save({ name: profile.name, email: profile.email, picture: profile.picture });
      this.roomSocket.join({
        roomCode: this.roomCode(),
        clientId: this.clientId.getOrCreate(),
        name: profile.name,
        email: profile.email,
        picture: profile.picture,
      });
    } catch (err) {
      this.errorMessage.set(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      this.googlePending.set(false);
    }
  }
}
