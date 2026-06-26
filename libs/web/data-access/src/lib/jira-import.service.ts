import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ImportTicketsResult, JiraImportPayload } from '@quorum/shared-domain';
import { firstValueFrom } from 'rxjs';
import { QUORUM_APP_CONFIG } from './app-config.token';

@Injectable({ providedIn: 'root' })
export class JiraImportService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(QUORUM_APP_CONFIG);

  async importBacklog(payload: JiraImportPayload): Promise<ImportTicketsResult> {
    try {
      return await firstValueFrom(
        this.http.post<ImportTicketsResult>(`${this.config.apiUrl}/jira/import`, payload)
      );
    } catch (err) {
      throw new Error(this.toMessage(err));
    }
  }

  private toMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'Could not reach the server. Check your connection and try again.';
      }
      const message = err.error?.message;
      if (typeof message === 'string') return message;
    }
    return 'Something went wrong importing from Jira. Please try again.';
  }
}
