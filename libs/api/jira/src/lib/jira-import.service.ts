import { Injectable } from '@nestjs/common';
import { ImportTicketsResult, JiraImportPayload } from '@quorum/shared-domain';
import { RoomStateService } from '@quorum/api-room';
import { discoverStoryPointsFieldId, JiraCredentials, searchIssues } from './jira-client';
import { JiraRequestError } from './jira-errors';
import { mapJiraIssue } from './jira-mapper';

@Injectable()
export class JiraImportService {
  constructor(private readonly roomState: RoomStateService) {}

  async import(payload: JiraImportPayload): Promise<ImportTicketsResult> {
    this.roomState.getSnapshot(payload.roomCode);
    const jql = this.buildJql(payload);
    const creds: JiraCredentials = {
      siteUrl: payload.siteUrl,
      email: payload.email,
      apiToken: payload.apiToken,
    };

    const storyPointsFieldId = await discoverStoryPointsFieldId(creds);
    const issues = await searchIssues(creds, jql, storyPointsFieldId);
    if (!issues.length) {
      throw new JiraRequestError('No issues found for that query');
    }

    const tickets = issues.map((issue) => mapJiraIssue(issue, storyPointsFieldId));
    const updated = this.roomState.importTickets(payload.roomCode, tickets);
    return { roomCode: payload.roomCode, tickets: updated.tickets };
  }

  private buildJql(payload: JiraImportPayload): string {
    if (payload.jql?.trim()) {
      return payload.jql.trim();
    }
    if (payload.projectKey?.trim()) {
      const key = payload.projectKey.trim().replace(/"/g, '');
      return `project = "${key}" ORDER BY created ASC`;
    }
    throw new JiraRequestError('Provide a Jira project key or a custom JQL query');
  }
}
