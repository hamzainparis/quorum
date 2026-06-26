import { Injectable, signal } from '@angular/core';

export type CardTheme = 'classic' | 'realistic';

const STORAGE_KEY = 'quorum.cardTheme';

@Injectable({ providedIn: 'root' })
export class CardThemeService {
  readonly theme = signal<CardTheme>(this.readStored());

  constructor() {
    this.apply(this.theme());
  }

  toggle(): void {
    const next: CardTheme = this.theme() === 'realistic' ? 'classic' : 'realistic';
    this.theme.set(next);
    localStorage.setItem(STORAGE_KEY, next);
    this.apply(next);
  }

  private readStored(): CardTheme {
    return localStorage.getItem(STORAGE_KEY) === 'realistic' ? 'realistic' : 'classic';
  }

  private apply(theme: CardTheme): void {
    document.documentElement.setAttribute('data-card-theme', theme);
  }
}
