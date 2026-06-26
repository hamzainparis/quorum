import { RoomNotFoundError, RoomStateService } from '@quorum/api-room';
import { JiraImportPayload } from '@quorum/shared-domain';
import { discoverStoryPointsFieldId, searchIssues } from './jira-client';
import { JiraRequestError } from './jira-errors';
import { JiraImportService } from './jira-import.service';

jest.mock('./jira-client', () => ({
  discoverStoryPointsFieldId: jest.fn(),
  searchIssues: jest.fn(),
}));

const discoverMock = discoverStoryPointsFieldId as jest.Mock;
const searchMock = searchIssues as jest.Mock;

function payload(overrides: Partial<JiraImportPayload> = {}): JiraImportPayload {
  return {
    roomCode: 'ABCD',
    clientId: 'p1',
    siteUrl: 'https://acme.atlassian.net',
    email: 'alex@acme.com',
    apiToken: 'token',
    projectKey: 'SPR',
    ...overrides,
  };
}

describe('JiraImportService', () => {
  let roomState: RoomStateService;
  let service: JiraImportService;

  beforeEach(() => {
    roomState = new RoomStateService();
    service = new JiraImportService(roomState);
    discoverMock.mockReset();
    searchMock.mockReset();
  });

  it('rejects when the room does not exist', async () => {
    await expect(service.import(payload())).rejects.toThrow(RoomNotFoundError);
  });

  it('rejects when neither projectKey nor jql is provided', async () => {
    roomState.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' }, 's1');
    await expect(
      service.import(payload({ projectKey: undefined, jql: undefined }))
    ).rejects.toThrow(JiraRequestError);
  });

  it('rejects when Jira returns no issues', async () => {
    roomState.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' }, 's1');
    discoverMock.mockResolvedValue(null);
    searchMock.mockResolvedValue([]);
    await expect(service.import(payload())).rejects.toThrow(JiraRequestError);
  });

  it('imports mapped tickets into the room and broadcasts the update', async () => {
    roomState.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' }, 's1');
    discoverMock.mockResolvedValue('customfield_10016');
    searchMock.mockResolvedValue([
      {
        id: '1',
        key: 'SPR-1',
        fields: {
          summary: 'Add login',
          issuetype: { name: 'Story' },
          priority: { name: 'High' },
          customfield_10016: 5,
        },
      },
    ]);

    const updates: string[] = [];
    roomState.updates$.subscribe((u) => updates.push(u.roomCode));

    const result = await service.import(payload());
    expect(result.roomCode).toBe('ABCD');
    expect(result.tickets).toHaveLength(1);
    expect(result.tickets[0]).toMatchObject({ key: 'SPR-1', estimate: 5, type: 'story' });
    expect(updates).toContain('ABCD');

    expect(roomState.getSnapshot('ABCD').tickets[0]).toMatchObject({ key: 'SPR-1' });
  });

  it('uses a custom jql query verbatim when provided', async () => {
    roomState.join({ roomCode: 'ABCD', clientId: 'p1', name: 'Alex' }, 's1');
    discoverMock.mockResolvedValue(null);
    searchMock.mockResolvedValue([
      { id: '1', key: 'SPR-1', fields: { summary: 'x', issuetype: {}, priority: {} } },
    ]);

    await service.import(payload({ projectKey: undefined, jql: 'project = SPR AND sprint in openSprints()' }));
    expect(searchMock).toHaveBeenCalledWith(
      expect.anything(),
      'project = SPR AND sprint in openSprints()',
      null
    );
  });
});
