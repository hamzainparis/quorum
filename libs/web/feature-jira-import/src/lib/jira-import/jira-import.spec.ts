import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JiraImportService, ProjectSettingsService, RoomSocketService } from '@quorum/web-data-access';
import { JiraImport } from './jira-import';

describe('JiraImport', () => {
  let fixture: ComponentFixture<JiraImport>;
  let component: JiraImport;
  let importBacklog: jest.Mock;
  let importTickets: jest.Mock;
  let addTicket: jest.Mock;
  let settings: ReturnType<typeof signal<{ jiraSiteUrl: string; jiraEmail: string; jiraApiToken: string; jiraProjectKey: string }>>;

  beforeEach(async () => {
    importBacklog = jest.fn();
    importTickets = jest.fn();
    addTicket = jest.fn();
    settings = signal({ jiraSiteUrl: 'https://team.atlassian.net', jiraEmail: 'me@team.com', jiraApiToken: 'secret', jiraProjectKey: '' });

    await TestBed.configureTestingModule({
      imports: [JiraImport],
      providers: [
        { provide: JiraImportService, useValue: { importBacklog } },
        { provide: RoomSocketService, useValue: { importTickets, addTicket } },
        { provide: ProjectSettingsService, useValue: { settings } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JiraImport);
    fixture.componentRef.setInput('roomCode', 'ABCD');
    fixture.componentRef.setInput('clientId', 'client-1');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('emits close when the backdrop is clicked', () => {
    const spy = jest.fn();
    component.closeImport.subscribe(spy);
    fixture.nativeElement.querySelector('.qrm-jira-import__backdrop').click();
    expect(spy).toHaveBeenCalled();
  });

  it('emits close when the close button is clicked', () => {
    const spy = jest.fn();
    component.closeImport.subscribe(spy);
    fixture.nativeElement.querySelector('.qrm-jira-import__close').click();
    expect(spy).toHaveBeenCalled();
  });

  it('defaults to the jira tab unless initialTab says otherwise', () => {
    expect(component.activeTab()).toBe('jira');
  });

  describe('Jira API tab', () => {
    it('disables import until a project key or JQL is entered', () => {
      expect(component.jiraCanSubmit()).toBe(false);
      component.jiraProjectKey.set('SPR');
      expect(component.jiraCanSubmit()).toBe(true);
    });

    it('requires Jira settings to be configured', () => {
      settings.update((s) => ({ ...s, jiraSiteUrl: '' }));
      component.jiraProjectKey.set('SPR');
      expect(component.jiraCanSubmit()).toBe(false);
    });

    it('submits using the stored project settings and closes on success', async () => {
      importBacklog.mockResolvedValue({ roomCode: 'ABCD', tickets: [] });
      component.jiraProjectKey.set('SPR');
      const spy = jest.fn();
      component.closeImport.subscribe(spy);

      await component.submitJira();

      expect(importBacklog).toHaveBeenCalledWith({
        roomCode: 'ABCD',
        clientId: 'client-1',
        siteUrl: 'https://team.atlassian.net',
        email: 'me@team.com',
        apiToken: 'secret',
        projectKey: 'SPR',
        jql: undefined,
      });
      expect(spy).toHaveBeenCalled();
    });

    it('shows the error message and stays open when the import fails', async () => {
      importBacklog.mockRejectedValue(new Error('Something went wrong.'));
      component.jiraProjectKey.set('SPR');
      const spy = jest.fn();
      component.closeImport.subscribe(spy);

      await component.submitJira();

      expect(component.jiraError()).toBe('Something went wrong.');
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('XML import tab', () => {
    function buildXml(descriptionCdata: string): string {
      return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="0.92">
  <channel>
    <item>
      <key id="1023">DTO-1023</key>
      <summary>Fallback Tab</summary>
      <type>Story</type>
      <priority>High</priority>
      <description><![CDATA[${descriptionCdata}]]></description>
    </item>
  </channel>
</rss>`;
    }

    async function importFile(xml: string): Promise<void> {
      const file = new File([xml], 'export.xml', { type: 'application/xml' });
      const input = { files: [file] } as unknown as HTMLInputElement;
      component.onXmlFiles({ target: input } as unknown as Event);
      for (let i = 0; i < 20 && component.xmlParsed() === null && component.xmlError() === null; i++) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      if (component.xmlError()) {
        throw new Error(`xmlError was set: ${component.xmlError()}`);
      }
    }

    it('decodes double-HTML-escaped description entities into real markup', async () => {
      await importFile(buildXml('&lt;h4&gt;Context&lt;/h4&gt;'));
      expect(component.xmlParsed()?.[0].desc).toBe('<h4>Context</h4>');
    });

    it('leaves already-correct HTML descriptions untouched', async () => {
      await importFile(buildXml('<h4>Context</h4>'));
      expect(component.xmlParsed()?.[0].desc).toBe('<h4>Context</h4>');
    });
  });

  describe('Create ticket tab', () => {
    it('disables submit until a title is entered', () => {
      expect(component.createCanSubmit()).toBe(false);
      component.createTitle.set('Fix the thing');
      expect(component.createCanSubmit()).toBe(true);
    });

    it('adds the ticket and closes', () => {
      component.createTitle.set('Fix the thing');
      component.createType.set('bug');
      component.createPriority.set('High');
      component.createDesc.set('<p>Details</p>');
      const spy = jest.fn();
      component.closeImport.subscribe(spy);

      component.submitCreate();

      expect(addTicket).toHaveBeenCalledWith({
        title: 'Fix the thing',
        type: 'bug',
        priority: 'High',
        desc: '<p>Details</p>',
      });
      expect(spy).toHaveBeenCalled();
    });
  });
});
