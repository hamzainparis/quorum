export class JiraAuthError extends Error {
  constructor() {
    super('Jira rejected that email or API token');
    this.name = 'JiraAuthError';
  }
}

export class JiraRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JiraRequestError';
  }
}

export class JiraUnreachableError extends Error {
  constructor(siteUrl: string) {
    super(`Could not reach Jira site "${siteUrl}"`);
    this.name = 'JiraUnreachableError';
  }
}
