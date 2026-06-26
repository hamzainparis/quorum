import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Ticket } from '@quorum/shared-domain';
import { Board } from './board';

const tickets: Ticket[] = [
  { id: 't1', key: 'SPR-101', type: 'story', title: 'OAuth login', desc: 'Add Google sign-in', priority: 'High', estimate: 5 },
  { id: 't2', key: 'SPR-102', type: 'bug', title: 'Vote sync', desc: '', priority: 'Med', estimate: null },
];

describe('Board', () => {
  let fixture: ComponentFixture<Board>;
  let component: Board;

  function setup(isFacilitator = false) {
    fixture = TestBed.createComponent(Board);
    fixture.componentRef.setInput('tickets', tickets);
    fixture.componentRef.setInput('activeTicketId', 't2');
    fixture.componentRef.setInput('isFacilitator', isFacilitator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Board] }).compileComponents();
  });

  it('computes points done and progress from estimated tickets', () => {
    setup();
    expect(component.pointsDone()).toBe(5);
    expect(component.estimatedCount()).toBe(1);
    expect(component.progressPct()).toBe(50);
  });

  it('renders a row per ticket with the key visible', () => {
    setup();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('SPR-101');
    expect(text).toContain('SPR-102');
  });

  it('marks the active ticket and shows the voting indicator', () => {
    setup();
    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.qrm-ticket'));
    const active = rows.find((r) => r.className.includes('qrm-ticket--active'));
    expect(active?.textContent).toContain('VOTING NOW');
  });

  it('emits selectTicket when the facilitator clicks a row', () => {
    setup(true);
    const spy = jest.fn();
    component.selectTicket.subscribe(spy);
    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.qrm-ticket'));
    rows[0].click();
    expect(spy).toHaveBeenCalledWith('t1');
  });

  it('makes rows draggable for the facilitator but not for participants', () => {
    setup(true);
    let rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.qrm-ticket'));
    expect((rows[0] as HTMLElement & { draggable: boolean }).draggable).toBe(true);

    setup(false);
    rows = Array.from(fixture.nativeElement.querySelectorAll('.qrm-ticket'));
    expect((rows[0] as HTMLElement & { draggable: boolean }).draggable).toBe(false);
  });

  it('opens a read-only detail view instead of emitting selectTicket when a participant clicks a row', () => {
    setup(false);
    const spy = jest.fn();
    component.selectTicket.subscribe(spy);
    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.qrm-ticket'));
    rows[0].click();
    fixture.detectChanges();

    expect(spy).not.toHaveBeenCalled();
    const dialog = fixture.nativeElement.querySelector('.qrm-ticket-detail__dialog');
    expect(dialog?.textContent).toContain('SPR-101');
    expect(dialog?.textContent).toContain('Add Google sign-in');
  });

  it('closes the detail view when the close button is clicked', () => {
    setup(false);
    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.qrm-ticket'));
    rows[0].click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.qrm-ticket-detail__dialog')).not.toBeNull();

    fixture.nativeElement.querySelector('.qrm-ticket-detail__close').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.qrm-ticket-detail__dialog')).toBeNull();
  });

  it('emits reorderTickets with the new order once a drag completes', () => {
    setup(true);
    const spy = jest.fn();
    component.reorderTickets.subscribe(spy);

    component.onDragStart(tickets[0]);
    const event = new Event('dragover');
    component.onDragOver(event as DragEvent, tickets[1]);
    component.onDragEnd();

    expect(spy).toHaveBeenCalledWith(['t2', 't1']);
  });

  it('emits openImport when the import button is clicked', () => {
    setup();
    const spy = jest.fn();
    component.openImport.subscribe(spy);
    fixture.nativeElement.querySelector('.qrm-board__import').click();
    expect(spy).toHaveBeenCalled();
  });

  it('emits deleteTicket for the right ticket once the user confirms', () => {
    setup();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const spy = jest.fn();
    component.deleteTicket.subscribe(spy);
    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.qrm-ticket'));
    const deleteBtn = rows[1].querySelector('.qrm-ticket__delete') as HTMLButtonElement;
    deleteBtn.click();
    expect(spy).toHaveBeenCalledWith('t2');
  });

  it('does not emit deleteTicket, or select the ticket, when the user cancels confirmation', () => {
    setup(true);
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    const deleteSpy = jest.fn();
    const selectSpy = jest.fn();
    component.deleteTicket.subscribe(deleteSpy);
    component.selectTicket.subscribe(selectSpy);
    const rows: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.qrm-ticket'));
    const deleteBtn = rows[0].querySelector('.qrm-ticket__delete') as HTMLButtonElement;
    deleteBtn.click();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(selectSpy).not.toHaveBeenCalled();
  });
});
