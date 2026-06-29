export interface JiraImportPayload {
  roomCode: string;
  clientId: string;
  siteUrl: string;
  email: string;
  apiToken: string;
  projectKey?: string;
  jql?: string;
}

/** Credentials sent per-request to call the Jira REST API server-side. Never persisted. */
export interface JiraCredentialsPayload {
  siteUrl: string;
  email: string;
  apiToken: string;
}

/** Autocomplete request: find issues whose key or summary match a typed query. */
export interface JiraSearchPayload extends JiraCredentialsPayload {
  query: string;
  /** Optional project key to scope suggestions (e.g. only SCRUM-* issues). */
  projectKey?: string;
}

/** A lightweight match returned by the ticket-number autosearch. */
export interface JiraIssueSuggestion {
  key: string;
  summary: string;
}

export interface JiraSearchResult {
  issues: JiraIssueSuggestion[];
}

/** Push a story-points estimate back onto a Jira issue. */
export interface JiraStoryPointsPayload extends JiraCredentialsPayload {
  issueKey: string;
  /** Story points to write; null clears the field. */
  points: number | null;
}

export interface JiraStoryPointsResult {
  issueKey: string;
  points: number | null;
}
