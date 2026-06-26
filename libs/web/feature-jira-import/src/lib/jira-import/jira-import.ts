import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { Priority, Ticket, TicketType } from '@quorum/shared-domain';
import { JiraImportService, ProjectSettingsService, RoomSocketService } from '@quorum/web-data-access';
import { Button, RichEditor } from '@quorum/web-ui';

type Tab = 'jira' | 'xml' | 'create';

const TICKET_TYPES: TicketType[] = ['story', 'task', 'bug'];
const PRIORITIES: Priority[] = ['High', 'Med', 'Low'];

@Component({
  selector: 'qrm-jira-import',
  imports: [Button, TitleCasePipe, RichEditor],
  templateUrl: './jira-import.html',
  styleUrl: './jira-import.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JiraImport {
  roomCode = input.required<string>();
  clientId = input.required<string>();
  initialTab = input<Tab>('jira');

  readonly closeImport = output<void>();

  private readonly jiraImportSvc = inject(JiraImportService);
  private readonly roomSocket = inject(RoomSocketService);
  private readonly settingsSvc = inject(ProjectSettingsService);

  readonly ticketTypes = TICKET_TYPES;
  readonly priorities = PRIORITIES;

  // ── Tab state ────────────────────────────────────────────────────
  readonly activeTab = signal<Tab>(this.initialTab());

  // ── Jira API tab ─────────────────────────────────────────────────
  readonly jiraProjectKey = signal(this.settingsSvc.settings().jiraProjectKey);
  readonly jiraJql = signal('');
  readonly jiraSubmitting = signal(false);
  readonly jiraError = signal<string | null>(null);

  readonly jiraSettings = this.settingsSvc.settings;

  readonly jiraCanSubmit = computed(
    () =>
      !this.jiraSubmitting() &&
      (this.jiraProjectKey().trim().length > 0 || this.jiraJql().trim().length > 0) &&
      this.jiraSettings().jiraSiteUrl.trim().length > 0 &&
      this.jiraSettings().jiraEmail.trim().length > 0 &&
      this.jiraSettings().jiraApiToken.trim().length > 0
  );

  // ── XML tab ──────────────────────────────────────────────────────
  readonly xmlParsed = signal<Ticket[] | null>(null);
  readonly xmlError = signal<string | null>(null);
  readonly xmlFileName = signal<string | null>(null);

  readonly xmlCanImport = computed(() => (this.xmlParsed()?.length ?? 0) > 0);

  // ── Create ticket tab ────────────────────────────────────────────
  readonly createTitle = signal('');
  readonly createType = signal<TicketType>('story');
  readonly createPriority = signal<Priority>('Med');
  readonly createDesc = signal('');

  readonly createCanSubmit = computed(() => this.createTitle().trim().length > 0);

  // ── Jira API tab actions ─────────────────────────────────────────
  onJiraProjectKeyInput(e: Event): void {
    this.jiraProjectKey.set((e.target as HTMLInputElement).value);
  }

  onJiraJqlInput(e: Event): void {
    this.jiraJql.set((e.target as HTMLTextAreaElement).value);
  }

  async submitJira(): Promise<void> {
    if (!this.jiraCanSubmit()) return;
    this.jiraError.set(null);
    this.jiraSubmitting.set(true);
    const s = this.jiraSettings();
    try {
      await this.jiraImportSvc.importBacklog({
        roomCode: this.roomCode(),
        clientId: this.clientId(),
        siteUrl: s.jiraSiteUrl.trim(),
        email: s.jiraEmail.trim(),
        apiToken: s.jiraApiToken.trim(),
        projectKey: this.jiraProjectKey().trim() || undefined,
        jql: this.jiraJql().trim() || undefined,
      });
      this.closeImport.emit();
    } catch (err) {
      this.jiraError.set(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      this.jiraSubmitting.set(false);
    }
  }

  // ── XML tab actions ───────────────────────────────────────────────
  onXmlFiles(event: Event): void {
    const files = Array.from((event.target as HTMLInputElement).files ?? []);
    if (!files.length) return;

    this.xmlError.set(null);
    this.xmlParsed.set(null);
    this.xmlFileName.set(
      files.length === 1 ? files[0].name : `${files.length} files selected`
    );

    const readFile = (f: File): Promise<Ticket[]> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            resolve(parseJiraXml(reader.result as string));
          } catch {
            reject(new Error(`Could not parse "${f.name}"`));
          }
        };
        reader.onerror = () => reject(new Error(`Could not read "${f.name}"`));
        reader.readAsText(f);
      });

    Promise.all(files.map(readFile))
      .then((results) => {
        // Deduplicate across files by id
        const seen = new Set<string>();
        const all: Ticket[] = [];
        for (const batch of results) {
          for (const t of batch) {
            if (!seen.has(t.id)) {
              seen.add(t.id);
              all.push(t);
            }
          }
        }
        if (!all.length) {
          this.xmlError.set('No issues found in the selected file(s).');
        } else {
          this.xmlParsed.set(all);
        }
      })
      .catch((err: Error) => {
        this.xmlError.set(err.message + '. Make sure the files are valid Jira XML exports.');
      });
  }

  importXml(): void {
    const tickets = this.xmlParsed();
    if (!tickets?.length) return;
    this.roomSocket.importTickets(tickets);
    this.closeImport.emit();
  }

  // ── Create ticket actions ─────────────────────────────────────────
  onCreateTitleInput(e: Event): void {
    this.createTitle.set((e.target as HTMLInputElement).value);
  }

  onCreateTypeChange(e: Event): void {
    this.createType.set((e.target as HTMLSelectElement).value as TicketType);
  }

  onCreatePriorityChange(e: Event): void {
    this.createPriority.set((e.target as HTMLSelectElement).value as Priority);
  }

  submitCreate(): void {
    if (!this.createCanSubmit()) return;
    this.roomSocket.addTicket({
      title: this.createTitle().trim(),
      type: this.createType(),
      priority: this.createPriority(),
      desc: this.createDesc().trim(),
    });
    this.closeImport.emit();
  }
}

// ── Jira XML parser (browser-side DOMParser) ──────────────────────────────────

function getText(item: Element, tag: string): string {
  return item.querySelector(tag)?.textContent?.trim() ?? '';
}

// Some Jira instances export the description CDATA already HTML-entity-encoded
// (e.g. "&lt;h4&gt;Context&lt;/h4&gt;" instead of "<h4>Context</h4>"), so textContent
// comes back with literal tag syntax as visible text rather than real markup. Detect
// that case (entities present, no real tags) and decode once via a <textarea>, whose
// RCDATA parsing decodes character references without ever tokenizing tags as elements.
function decodeIfDoubleEscaped(html: string): string {
  if (html.includes('<') || !/&lt;\/?[a-z]/i.test(html)) {
    return html;
  }
  const ta = document.createElement('textarea');
  ta.innerHTML = html;
  return ta.value;
}

function mapType(raw: string): TicketType {
  const n = raw.toLowerCase();
  if (n.includes('bug')) return 'bug';
  if (n.includes('story')) return 'story';
  return 'task';
}

function mapPriority(raw: string): Priority {
  const n = raw.toLowerCase();
  if (n.includes('high')) return 'High';
  if (n.includes('low')) return 'Low';
  return 'Med';
}

function parseJiraXml(xmlString: string): Ticket[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) throw new Error('XML parse error');

  const items = Array.from(doc.querySelectorAll('channel > item'));
  return items.map((item, idx) => {
    const keyEl = item.querySelector('key');
    const key = keyEl?.textContent?.trim() || `IMPORT-${idx + 1}`;
    // Use the Jira issue id attribute as the stable id so re-imports update rather than duplicate
    const jiraId = keyEl?.getAttribute('id');
    const id = jiraId ? `jira-${jiraId}` : `xml-${key}`;

    const title = getText(item, 'summary') || getText(item, 'title') || key;
    const typeRaw = getText(item, 'type');
    const priorityRaw = getText(item, 'priority');

    // Jira XML wraps description in CDATA; textContent returns the raw HTML string
    // (innerHTML would double-encode it as &lt;h4&gt; etc.)
    const descEl = item.querySelector('description');
    const desc = decodeIfDoubleEscaped(descEl?.textContent?.trim() ?? '');

    // Story points from customfields
    let estimate: number | null = null;
    for (const cf of Array.from(item.querySelectorAll('customfield'))) {
      const cfName = cf.querySelector('customfieldname')?.textContent?.toLowerCase() ?? '';
      if (cfName.includes('story point') || cfName.includes('story_point')) {
        const val = Number(cf.querySelector('customfieldvalue')?.textContent?.trim());
        if (Number.isFinite(val) && val > 0) {
          estimate = val;
        }
        break;
      }
    }

    return {
      id,
      key,
      type: mapType(typeRaw),
      title,
      desc,
      priority: mapPriority(priorityRaw),
      estimate,
    } satisfies Ticket;
  });
}

