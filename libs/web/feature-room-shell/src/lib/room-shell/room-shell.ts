import { DestroyRef, ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RoomSnapshot, VoteValue } from '@quorum/shared-domain';
import { CardThemeService, ClientIdService, ProjectSettings, ProjectSettingsService, RoomSocketService, UserProfileService } from '@quorum/web-data-access';
import { Avatar, Button } from '@quorum/web-ui';
import { Board } from '@quorum/web-feature-board';
import { Chat } from '@quorum/web-feature-chat';
import { JiraImport } from '@quorum/web-feature-jira-import';
import { Lobby } from '@quorum/web-feature-lobby';
import { Poker } from '@quorum/web-feature-poker';

type PanelKey = 'board' | 'poker' | 'chat';

interface PanelTab {
  key: PanelKey;
  label: string;
  icon: string;
}

@Component({
  selector: 'qrm-room-shell',
  imports: [Lobby, Board, Poker, Chat, JiraImport, Avatar, Button],
  templateUrl: './room-shell.html',
  styleUrl: './room-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomShell {
  roomCode = input.required<string>();

  private readonly clientId = inject(ClientIdService);
  private readonly roomSocket = inject(RoomSocketService);
  private readonly settingsSvc = inject(ProjectSettingsService);
  private readonly userProfile = inject(UserProfileService);
  private readonly cardThemeSvc = inject(CardThemeService);

  readonly currentPlayerId = this.clientId.getOrCreate();

  readonly tabs: PanelTab[] = [
    { key: 'board', label: 'Board', icon: '📋' },
    { key: 'poker', label: 'Poker', icon: '🃏' },
    { key: 'chat', label: 'Chat', icon: '💬' },
  ];

  readonly joined = signal(false);
  readonly snapshot = signal<RoomSnapshot | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly activePanel = signal<PanelKey>('board');
  readonly showImport = signal(false);
  readonly importInitialTab = signal<'jira' | 'xml' | 'create'>('jira');
  readonly showSettings = signal(false);
  readonly inviteCopied = signal(false);

  // Settings form fields — initialised from stored settings
  readonly settingsForm = signal<ProjectSettings>({ ...this.settingsSvc.settings() });
  readonly settingsSaved = signal(false);

  readonly isFacilitator = computed(() => this.snapshot()?.facilitatorId === this.currentPlayerId);
  readonly isRealisticTheme = computed(() => this.cardThemeSvc.theme() === 'realistic');
  readonly avatarStack = computed(() => this.snapshot()?.players.slice(0, 5) ?? []);
  readonly onlineCount = computed(() => this.snapshot()?.players.length ?? 0);

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.roomSocket.joined$.pipe(takeUntilDestroyed(destroyRef)).subscribe(() => this.joined.set(true));
    this.roomSocket.state$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((snapshot) => this.snapshot.set(snapshot));
    this.roomSocket.error$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(({ message }) => this.errorMessage.set(message));
    destroyRef.onDestroy(() => this.roomSocket.disconnect());

    // Auto-rejoin on refresh if the user has a saved profile
    effect(() => {
      const profile = this.userProfile.profile();
      const roomCode = this.roomCode();
      if (profile && roomCode) {
        this.roomSocket.join({
          roomCode,
          clientId: this.currentPlayerId,
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
        });
      }
    });
  }

  selectPanel(panel: PanelKey): void {
    this.activePanel.set(panel);
  }

  selectTicket(ticketId: string): void {
    this.roomSocket.selectTicket(ticketId);
  }

  reorderTickets(ticketIds: string[]): void {
    this.roomSocket.reorderTickets(ticketIds);
  }

  vote(value: VoteValue): void {
    this.roomSocket.vote(value);
  }

  reveal(): void {
    this.roomSocket.reveal();
  }

  resetVotes(): void {
    this.roomSocket.reset();
  }

  skip(): void {
    this.roomSocket.skip();
  }

  assignEstimate(value: number): void {
    this.roomSocket.assignEstimate(value);
  }

  setEstimate(payload: { ticketId: string; value: number | null }): void {
    this.roomSocket.setEstimate(payload.ticketId, payload.value);
  }

  deleteTicket(ticketId: string): void {
    this.roomSocket.deleteTicket(ticketId);
  }

  sendChat(text: string): void {
    this.roomSocket.sendChat(text);
  }

  toggleMute(): void {
    this.roomSocket.toggleMute();
  }

  claimFacilitator(): void {
    this.roomSocket.claimFacilitator();
  }

  toggleCardTheme(): void {
    this.cardThemeSvc.toggle();
  }

  leaveRoom(): void {
    if (!confirm('Disconnect from this room?')) return;
    this.roomSocket.disconnect();
    this.userProfile.clear();
    this.joined.set(false);
    this.snapshot.set(null);
  }

  openImport(): void {
    this.importInitialTab.set('jira');
    this.showImport.set(true);
  }

  openCreate(): void {
    this.importInitialTab.set('create');
    this.showImport.set(true);
  }

  closeImport(): void {
    this.showImport.set(false);
  }

  openSettings(): void {
    this.settingsForm.set({ ...this.settingsSvc.settings() });
    this.settingsSaved.set(false);
    this.showSettings.set(true);
  }

  closeSettings(): void {
    this.showSettings.set(false);
  }

  onSettingsInput(field: keyof ProjectSettings, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.settingsForm.update((f) => ({ ...f, [field]: value }));
  }

  saveSettings(): void {
    this.settingsSvc.save(this.settingsForm());
    this.settingsSaved.set(true);
    setTimeout(() => {
      this.settingsSaved.set(false);
      this.showSettings.set(false);
    }, 1200);
  }

  async copyInviteLink(): Promise<void> {
    const url = `${location.origin}/r/${this.roomCode()}`;
    try {
      await navigator.clipboard.writeText(url);
      this.inviteCopied.set(true);
      setTimeout(() => this.inviteCopied.set(false), 1800);
    } catch {
      this.inviteCopied.set(false);
    }
  }
}
