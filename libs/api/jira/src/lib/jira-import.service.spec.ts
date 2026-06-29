import { RoomNotFoundError, RoomStateService } from '@quorum/api-room';
import { JiraImportPayload } from '@quorum/shared-domain';
import {
  discoverStoryPointsFieldId,
  pickIssues,
  searchIssues,
  updateStoryPoints,
} from './jira-client';
import { JiraRequestError } from './jira-errors';
import { JiraImportService } from './jira-import.service';

jest.mock('./jira-client', () => ({
  discoverStoryPointsFieldId: jest.fn(),
  searchIssues: jest.fn(),
  pickIssues: jest.fn(),
  updateStoryPoints: jest.fn(),
}));

const discoverMock = discoverStoryPointsFieldId as jest.Mock;
const searchMock = searchIssues as jest.Mock;
const pickMock = pickIssues as jest.Mock;
const updateMock = updateStoryPoints as jest.Mock;

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
    pickMock.mockReset();
    updateMock.mockReset();
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

  describe('search', () => {
    const creds = { siteUrl: 'https://acme.atlassian.net', email: 'a@b.com', apiToken: 't' };

    it('returns no issues for a blank query without calling Jira', async () => {
      const result = await service.search({ ...creds, query: '   ' });
      expect(result).toEqual({ issues: [] });
      expect(pickMock).not.toHaveBeenCalled();
    });

    it('delegates the query (and optional project scope) to the issue picker', async () => {
      pickMock.mockResolvedValue([{ key: 'SPR-1', summary: 'Add login' }]);
      const result = await service.search({ ...creds, query: 'SPR-1', projectKey: 'SPR' });
      expect(pickMock).toHaveBeenCalledWith(expect.anything(), 'SPR-1', 'SPR');
      expect(result.issues).toEqual([{ key: 'SPR-1', summary: 'Add login' }]);
    });
  });

  describe('setStoryPoints', () => {
    const creds = { siteUrl: 'https://acme.atlassian.net', email: 'a@b.com', apiToken: 't' };

    it('rejects when the site has no story-points field', async () => {
      discoverMock.mockResolvedValue(null);
      await expect(
        service.setStoryPoints({ ...creds, issueKey: 'SPR-1', points: 5 })
      ).rejects.toThrow(JiraRequestError);
      expect(updateMock).not.toHaveBeenCalled();
    });

    it('writes the points onto the discovered story-points field', async () => {
      discoverMock.mockResolvedValue('customfield_10016');
      updateMock.mockResolvedValue(undefined);
      const result = await service.setStoryPoints({ ...creds, issueKey: 'SPR-1', points: 8 });
      expect(updateMock).toHaveBeenCalledWith(
        expect.anything(),
        'SPR-1',
        'customfield_10016',
        8
      );
      expect(result).toEqual({ issueKey: 'SPR-1', points: 8 });
    });
  });
});
