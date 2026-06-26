import { JiraAuthError, JiraRequestError, JiraUnreachableError } from './jira-errors';

export interface JiraCredentials {
  siteUrl: string;
  email: string;
  apiToken: string;
}

export interface JiraField {
  id: string;
  name: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: Record<string, unknown>;
}

function normalizeSiteUrl(siteUrl: string): string {
  return siteUrl.trim().replace(/\/+$/, '');
}

function authHeader(creds: JiraCredentials): string {
  return `Basic ${Buffer.from(`${creds.email}:${creds.apiToken}`).toString('base64')}`;
}

function extractJiraErrorMessage(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as { errorMessages?: string[] };
    if (Array.isArray(parsed.errorMessages) && parsed.errorMessages.length) {
      return parsed.errorMessages.join('; ');
    }
  } catch {
    // body wasn't JSON; fall through to a generic message
  }
  return undefined;
}

async function jiraFetch(
  creds: JiraCredentials,
  path: string,
  init: { method: 'GET' | 'POST'; body?: string }
): Promise<unknown> {
  const url = `${normalizeSiteUrl(creds.siteUrl)}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method,
      body: init.body,
      headers: {
        Authorization: authHeader(creds),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
  } catch {
    throw new JiraUnreachableError(creds.siteUrl);
  }

  if (res.status === 401 || res.status === 403) {
    throw new JiraAuthError();
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new JiraRequestError(extractJiraErrorMessage(text) ?? `Jira responded with ${res.status}`);
  }
  return res.json();
}

export async function discoverStoryPointsFieldId(creds: JiraCredentials): Promise<string | null> {
  const fields = (await jiraFetch(creds, '/rest/api/3/field', { method: 'GET' })) as JiraField[];
  const match = fields.find((f) => /story point/i.test(f.name));
  return match?.id ?? null;
}

export async function searchIssues(
  creds: JiraCredentials,
  jql: string,
  storyPointsFieldId: string | null
): Promise<JiraIssue[]> {
  const fields = ['summary', 'description', 'issuetype', 'priority'];
  if (storyPointsFieldId) fields.push(storyPointsFieldId);

  const data = (await jiraFetch(creds, '/rest/api/3/search/jql', {
    method: 'POST',
    body: JSON.stringify({ jql, fields, maxResults: 100 }),
  })) as { issues?: JiraIssue[] };

  return data.issues ?? [];
}
