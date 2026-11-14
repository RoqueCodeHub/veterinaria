import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RevealDirective } from './reveal';

@Component({
  standalone: true,
  imports: [RevealDirective],
  template: '<div appReveal></div>',
})
class RevealHost {}

describe('RevealDirective', () => {
  let fixture: ComponentFixture<RevealHost>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RevealHost] }).compileComponents();
    fixture = TestBed.createComponent(RevealHost);
  });

  it('keeps content visible when IntersectionObserver is unavailable', async () => {
    const originalObserver = globalThis.IntersectionObserver;
    Object.defineProperty(globalThis, 'IntersectionObserver', { configurable: true, value: undefined });

    try {
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelector('div').classList.contains('is-visible')).toBe(true);
    } finally {
      Object.defineProperty(globalThis, 'IntersectionObserver', { configurable: true, value: originalObserver });
    }
  });
});
