import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Card } from './card';

describe('Card', () => {
  let fixture: ComponentFixture<Card>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Card] }).compileComponents();
    fixture = TestBed.createComponent(Card);
    fixture.detectChanges();
  });

  it('defaults to the 18px panel radius', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.style.borderRadius).toBe('18px');
    expect(el.className).toContain('qrm-card--panel');
  });

  it('uses the 28px radius for the elevated variant', () => {
    fixture.componentRef.setInput('variant', 'elevated');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.style.borderRadius).toBe('28px');
  });

  it('allows an explicit radius override', () => {
    fixture.componentRef.setInput('radius', 22);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.style.borderRadius).toBe('22px');
  });
});
