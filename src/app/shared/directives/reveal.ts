import { Directive, ElementRef, OnDestroy, afterNextRender, inject } from '@angular/core';

@Directive({
  selector: '[appReveal]',
  host: { class: 'reveal' },
})
export class RevealDirective implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private observer: IntersectionObserver | null = null;

  constructor() {
    afterNextRender(() => {
      const node = this.el.nativeElement;
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      if (reduce || typeof IntersectionObserver === 'undefined') {
        node.classList.add('is-visible');
        return;
      }
      const rect = node.getBoundingClientRect();
      const inView = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
      node.classList.add('is-pending');
      const show = (): void => node.classList.add('is-visible');
      if (inView) {
        requestAnimationFrame(() => requestAnimationFrame(show));
        return;
      }
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }
            node.classList.add('is-visible');
            this.observer?.disconnect();
            this.observer = null;
          }
        },
        { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
      );
      this.observer.observe(node);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
