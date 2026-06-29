import { Injectable } from '@nestjs/common';
import {
  ImportTicketsResult,
  JiraImportPayload,
  JiraSearchPayload,
  JiraSearchResult,
  JiraStoryPointsPayload,
  JiraStoryPointsResult,
} from '@quorum/shared-domain';
import { RoomStateService } from '@quorum/api-room';
import {
  discoverStoryPointsFieldId,
  JiraCredentials,
  pickIssues,
  searchIssues,
  updateStoryPoints,
} from './jira-client';
import { JiraRequestError } from './jira-errors';
import { mapJiraIssue } from './jira-mapper';

@Injectable()
export class JiraImportService {
  constructor(private readonly roomState: RoomStateService) {}

  async import(payload: JiraImportPayload): Promise<ImportTicketsResult> {
    this.roomState.getSnapshot(payload.roomCode);
    const jql = this.buildJql(payload);
    const creds = this.creds(payload);

    const storyPointsFieldId = await discoverStoryPointsFieldId(creds);
    const issues = await searchIssues(creds, jql, storyPointsFieldId);
    if (!issues.length) {
      throw new JiraRequestError('No issues found for that query');
    }

    const tickets = issues.map((issue) => mapJiraIssue(issue, storyPointsFieldId));
    const updated = this.roomState.importTickets(payload.roomCode, tickets);
    return { roomCode: payload.roomCode, tickets: updated.tickets };
  }

  async search(payload: JiraSearchPayload): Promise<JiraSearchResult> {
    const query = payload.query?.trim() ?? '';
    if (!query) {
      return { issues: [] };
    }
    const issues = await pickIssues(this.creds(payload), query, payload.projectKey);
    return { issues };
  }

  async setStoryPoints(payload: JiraStoryPointsPayload): Promise<JiraStoryPointsResult> {
    const creds = this.creds(payload);
    const storyPointsFieldId = await discoverStoryPointsFieldId(creds);
    if (!storyPointsFieldId) {
      throw new JiraRequestError('Could not find a Story Points field on this Jira site');
    }
    await updateStoryPoints(creds, payload.issueKey, storyPointsFieldId, payload.points);
    return { issueKey: payload.issueKey, points: payload.points };
  }

  private creds(payload: { siteUrl: string; email: string; apiToken: string }): JiraCredentials {
    return { siteUrl: payload.siteUrl, email: payload.email, apiToken: payload.apiToken };
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
