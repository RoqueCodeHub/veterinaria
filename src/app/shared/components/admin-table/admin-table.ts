import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewEncapsulation,
  computed,
  contentChild,
  input,
  linkedSignal,
  output,
} from '@angular/core';

export interface AdminTableRowContext<T> {
  $implicit: T;
  index: number;
}

@Component({
  selector: 'app-admin-table',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './admin-table.html',
  styleUrl: './admin-table.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class AdminTable<T> {
  readonly rows = input.required<readonly T[]>();
  readonly pageSize = input(12);
  readonly columns = input(1);
  readonly itemLabel = input('registros');
  readonly emptyIcon = input('pi pi-inbox');
  readonly emptyTitle = input('Sin información');
  readonly emptyText = input('No hay registros para mostrar.');
  readonly resetKey = input<unknown>(0);
  readonly paging = input<'client' | 'server'>('client');
  readonly totalItems = input(0);
  readonly serverPage = input(1);
  readonly pageChange = output<number>();

  readonly headTemplate = contentChild.required<TemplateRef<unknown>>('head');
  readonly rowTemplate = contentChild.required<TemplateRef<AdminTableRowContext<T>>>('row');

  private readonly page = linkedSignal({
    source: this.resetKey,
    computation: () => 1,
  });

  readonly totalPages = computed(() => {
    const count = this.paging() === 'server' ? this.totalItems() : this.rows().length;
    return Math.max(1, Math.ceil(count / this.pageSize()));
  });

  readonly currentPage = computed(() => {
    const current = this.paging() === 'server' ? this.serverPage() : this.page();
    return Math.min(Math.max(1, current), this.totalPages());
  });

  readonly visible = computed(() => {
    if (this.paging() === 'server') return this.rows();
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.rows().slice(start, start + this.pageSize());
  });

  readonly summary = computed(() => {
    const total = this.paging() === 'server' ? this.totalItems() : this.rows().length;
    if (!total) return `0 de 0 ${this.itemLabel()}`;
    const start = (this.currentPage() - 1) * this.pageSize() + 1;
    const end = Math.min(this.currentPage() * this.pageSize(), total);
    return `Mostrando ${start}–${end} de ${total} ${this.itemLabel()}`;
  });

  readonly pages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
    const start = Math.max(1, Math.min(current - 2, total - 4));
    return Array.from({ length: 5 }, (_, index) => start + index);
  });

  goTo(page: number): void {
    const next = Math.min(Math.max(1, page), this.totalPages());
    if (this.paging() === 'server') {
      this.pageChange.emit(next);
      return;
    }
    this.page.set(next);
  }
}
