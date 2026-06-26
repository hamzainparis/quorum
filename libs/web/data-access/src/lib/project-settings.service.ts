import { Injectable, signal } from '@angular/core';

export interface ProjectSettings {
  jiraSiteUrl: string;
  jiraEmail: string;
  jiraApiToken: string;
  jiraProjectKey: string;
}

const STORAGE_KEY = 'quorum:project-settings';
const EMPTY: ProjectSettings = {
  jiraSiteUrl: '',
  jiraEmail: '',
  jiraApiToken: '',
  jiraProjectKey: '',
};

/**
 * Jira credentials (site URL, email, API token) are session-only and never persisted —
 * they're used transiently per-request and must not end up in storage or logs. Only the
 * non-sensitive default project key is saved across sessions.
 */
@Injectable({ providedIn: 'root' })
export class ProjectSettingsService {
  private readonly _settings = signal<ProjectSettings>(this.load());
  readonly settings = this._settings.asReadonly();

  save(settings: ProjectSettings): void {
    this._settings.set({ ...settings });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ jiraProjectKey: settings.jiraProjectKey }));
    } catch { /* localStorage unavailable */ }
  }

  private load(): ProjectSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ProjectSettings>;
        return { ...EMPTY, jiraProjectKey: parsed.jiraProjectKey ?? '' };
      }
    } catch { /* localStorage unavailable */ }
    return { ...EMPTY };
  }
}
