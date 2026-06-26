import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Button } from './button';

describe('Button', () => {
  let fixture: ComponentFixture<Button>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Button] }).compileComponents();
    fixture = TestBed.createComponent(Button);
    fixture.detectChanges();
  });

  it('defaults to the primary md variant', () => {
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(btn.className).toContain('qrm-btn--primary');
    expect(btn.className).toContain('qrm-btn--md');
  });

  it('reflects the disabled input on the native button', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(btn.disabled).toBe(true);
  });

  it('applies the full-width class when requested', () => {
    fixture.componentRef.setInput('fullWidth', true);
    fixture.detectChanges();
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(btn.className).toContain('qrm-btn--full');
  });
});
