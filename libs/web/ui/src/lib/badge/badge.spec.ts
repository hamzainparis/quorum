import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Badge } from './badge';

describe('Badge', () => {
  let fixture: ComponentFixture<Badge>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Badge] }).compileComponents();
    fixture = TestBed.createComponent(Badge);
  });

  it('applies the given color and background for a pill', () => {
    fixture.componentRef.setInput('color', '#E04F4F');
    fixture.componentRef.setInput('background', '#FDECEC');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement.querySelector('.qrm-badge');
    expect(el.style.color).toBe('rgb(224, 79, 79)');
    expect(el.style.background).toBe('rgb(253, 236, 236)');
  });

  it('forces white text and uses color as background for the square shape', () => {
    fixture.componentRef.setInput('color', '#6D5EF6');
    fixture.componentRef.setInput('shape', 'square');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement.querySelector('.qrm-badge');
    expect(el.style.color).toBe('rgb(255, 255, 255)');
    expect(el.style.background).toBe('rgb(109, 94, 246)');
  });
});
