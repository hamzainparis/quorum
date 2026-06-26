import { CardThemeService } from './card-theme.service';

describe('CardThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-card-theme');
  });

  it('defaults to the classic theme and applies it to the document', () => {
    const service = new CardThemeService();
    expect(service.theme()).toBe('classic');
    expect(document.documentElement.getAttribute('data-card-theme')).toBe('classic');
  });

  it('toggles between classic and realistic, persisting the choice', () => {
    const service = new CardThemeService();

    service.toggle();
    expect(service.theme()).toBe('realistic');
    expect(localStorage.getItem('quorum.cardTheme')).toBe('realistic');
    expect(document.documentElement.getAttribute('data-card-theme')).toBe('realistic');

    service.toggle();
    expect(service.theme()).toBe('classic');
    expect(localStorage.getItem('quorum.cardTheme')).toBe('classic');
  });

  it('restores the previously saved theme on construction', () => {
    localStorage.setItem('quorum.cardTheme', 'realistic');
    const service = new CardThemeService();
    expect(service.theme()).toBe('realistic');
    expect(document.documentElement.getAttribute('data-card-theme')).toBe('realistic');
  });
});
