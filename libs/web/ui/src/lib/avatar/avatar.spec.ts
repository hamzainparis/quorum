import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Avatar } from './avatar';

describe('Avatar', () => {
  let fixture: ComponentFixture<Avatar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Avatar] }).compileComponents();
    fixture = TestBed.createComponent(Avatar);
    fixture.componentRef.setInput('name', 'Maya Chen');
    fixture.componentRef.setInput('color', '#FF6B57');
    fixture.detectChanges();
  });

  it('renders initials from the name', () => {
    expect(fixture.nativeElement.textContent.trim()).toBe('MC');
  });

  it('defaults to the md size', () => {
    const el: HTMLElement = fixture.nativeElement.querySelector('.qrm-avatar');
    expect(el.style.width).toBe('32px');
    expect(el.style.fontSize).toBe('12px');
  });

  it('applies the requested size', () => {
    fixture.componentRef.setInput('size', 'xs');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement.querySelector('.qrm-avatar');
    expect(el.style.width).toBe('18px');
    expect(el.style.fontSize).toBe('8.5px');
  });
});
