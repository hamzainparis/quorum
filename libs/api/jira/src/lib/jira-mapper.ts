import { Priority, Ticket, TicketType } from '@quorum/shared-domain';
import { adfToHtml } from './adf-to-html';
import { JiraIssue } from './jira-client';

function mapType(name: string | undefined): TicketType {
  const n = (name ?? '').toLowerCase();
  if (n.includes('bug')) return 'bug';
  if (n.includes('story')) return 'story';
  return 'task';
}

function mapPriority(name: string | undefined): Priority {
  const n = (name ?? '').toLowerCase();
  if (n.includes('high')) return 'High';
  if (n.includes('low')) return 'Low';
  return 'Med';
}

export function mapJiraIssue(issue: JiraIssue, storyPointsFieldId: string | null): Ticket {
  const fields = issue.fields ?? {};
  const estimateRaw = storyPointsFieldId ? fields[storyPointsFieldId] : null;
  const estimate =
    typeof estimateRaw === 'number' && Number.isFinite(estimateRaw) ? estimateRaw : null;
  const issueType = fields['issuetype'] as { name?: string } | undefined;
  const priority = fields['priority'] as { name?: string } | undefined;

  return {
    id: issue.id,
    key: issue.key,
    type: mapType(issueType?.name),
    title: (fields['summary'] as string) ?? issue.key,
    desc: adfToHtml(fields['description']),
    priority: mapPriority(priority?.name),
    estimate,
    source: 'jira',
  };
}
