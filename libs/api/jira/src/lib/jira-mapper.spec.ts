import { JiraIssue } from './jira-client';
import { mapJiraIssue } from './jira-mapper';

function issue(overrides: Partial<JiraIssue['fields']> = {}): JiraIssue {
  return {
    id: '10001',
    key: 'SPR-101',
    fields: {
      summary: 'Add OAuth login',
      description: null,
      issuetype: { name: 'Story' },
      priority: { name: 'High' },
      ...overrides,
    },
  };
}

describe('mapJiraIssue', () => {
  it('maps core fields', () => {
    const ticket = mapJiraIssue(issue(), null);
    expect(ticket).toMatchObject({
      id: '10001',
      key: 'SPR-101',
      type: 'story',
      title: 'Add OAuth login',
      priority: 'High',
      estimate: null,
    });
  });

  it('reads story points from the discovered custom field', () => {
    const ticket = mapJiraIssue(issue({ customfield_10016: 5 }), 'customfield_10016');
    expect(ticket.estimate).toBe(5);
  });

  it('ignores a non-numeric story points value', () => {
    const ticket = mapJiraIssue(issue({ customfield_10016: null }), 'customfield_10016');
    expect(ticket.estimate).toBeNull();
  });

  it('classifies bug and task issue types', () => {
    expect(mapJiraIssue(issue({ issuetype: { name: 'Bug' } }), null).type).toBe('bug');
    expect(mapJiraIssue(issue({ issuetype: { name: 'Sub-task' } }), null).type).toBe('task');
  });

  it('maps unfamiliar priorities to Med', () => {
    expect(mapJiraIssue(issue({ priority: { name: 'Lowest' } }), null).priority).toBe('Low');
    expect(mapJiraIssue(issue({ priority: { name: 'Medium' } }), null).priority).toBe('Med');
  });
});
