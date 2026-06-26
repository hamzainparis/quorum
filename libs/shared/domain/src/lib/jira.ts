export interface JiraImportPayload {
  roomCode: string;
  clientId: string;
  siteUrl: string;
  email: string;
  apiToken: string;
  projectKey?: string;
  jql?: string;
}
