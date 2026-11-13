import { signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Page, PageQuery } from './envelope';

export class PagedList<T> {
  readonly rows = signal<T[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly loading = signal(false);
  readonly summary = signal<Record<string, number>>({});
  readonly q = signal('');
  extra: PageQuery['extra'] = {};
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly fetchPage: (query: PageQuery) => Observable<Page<T>>,
    private readonly onError?: (error: unknown) => void,
  ) {}

  load(page = this.page()): void {
    this.page.set(page);
    this.loading.set(true);
    this.fetchPage({
      page,
      perPage: 20,
      q: this.q().trim() || undefined,
      extra: this.extra,
    }).subscribe({
      next: (result) => {
        this.rows.set(result.items);
        this.total.set(result.meta.total);
        this.summary.set(result.summary ?? {});
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.onError?.(error);
      },
    });
  }

  search(value: string): void {
    this.q.set(value);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.load(1), 300);
  }

  count(key: string): number {
    return this.summary()[key] ?? 0;
  }
}
