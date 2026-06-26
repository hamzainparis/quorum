import { ClientIdService } from './client-id.service';

describe('ClientIdService', () => {
  beforeEach(() => localStorage.clear());

  it('creates and persists a client id', () => {
    const service = new ClientIdService();
    const id = service.getOrCreate();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(localStorage.getItem('quorum.clientId')).toBe(id);
  });

  it('returns the same id on subsequent calls', () => {
    const service = new ClientIdService();
    const first = service.getOrCreate();
    const second = service.getOrCreate();
    expect(second).toBe(first);
  });
});
