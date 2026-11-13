import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { apiMessage } from '../../../core/api/api-message';
import { PagedList } from '../../../core/api/paged-list';
import { Category, CategoryForm } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth';
import { CategoriesService } from '../../../core/services/catalog.service';
import { clearError } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [FormsModule, Button, Checkbox, Dialog, InputText, Select, AdminTable, ConfirmDialog],
  templateUrl: './categorias.html',
  styleUrl: './categorias.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Categorias implements OnInit {
  private readonly svc = inject(CategoriesService);
  private readonly notify = inject(NotifyService);
  readonly auth = inject(AuthService);
  readonly list = new PagedList<Category>(
    (query) => this.svc.list(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudieron cargar las categorías.')),
  );
  readonly modo = signal<'arbol' | 'lista'>('arbol');
  readonly todas = signal<Category[]>([]);
  readonly abiertos = signal<ReadonlySet<number>>(new Set());
  readonly modal = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<Category | null>(null);
  readonly quitar = signal<Category | null>(null);
  readonly errors = signal<Record<string, string>>({});
  form: CategoryForm = { nombre: '', parent_id: null, activo: true };
  readonly arbol = computed(() => this.ordenar(this.todas(), this.abiertos()));
  readonly padres = computed(() => {
    const id = this.editing()?.id;
    return [{ label: 'Sin padre', value: null as number | null }, ...this.todas().filter((row) => row.id !== id).map((row) => ({ label: row.nombre, value: row.id }))];
  });

  ngOnInit(): void {
    this.list.load(1);
    this.cargarArbol();
  }

  buscar(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.list.search(value);
  }

  abrir(row?: Category): void {
    this.errors.set({});
    this.editing.set(row ?? null);
    this.form = {
      nombre: row?.nombre ?? '',
      descripcion: row?.descripcion ?? '',
      parent_id: row?.parent_id ?? null,
      activo: row?.activo ?? true,
    };
    this.modal.set(true);
  }

  guardar(): void {
    if (!this.form.nombre.trim()) {
      this.errors.set({ nombre: 'Escribe el nombre de la categoría.' });
      return;
    }
    this.saving.set(true);
    const id = this.editing()?.id;
    const request = id ? this.svc.update(id, this.form) : this.svc.create(this.form);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modal.set(false);
        this.notify.success(id ? 'Categoría actualizada.' : 'Categoría creada.');
        this.list.load();
        this.cargarArbol();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo guardar la categoría.'));
      },
    });
  }

  confirmarQuitar(): void {
    const row = this.quitar();
    if (!row) return;
    this.svc.remove(row.id).subscribe({
      next: () => {
        this.notify.success('Categoría eliminada.');
        this.quitar.set(null);
        this.list.load();
        this.cargarArbol();
      },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo eliminar la categoría.')),
    });
  }

  limpiar(): void { this.errors.update((current) => clearError(current, 'nombre')); }

  toggle(id: number): void {
    const next = new Set(this.abiertos());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.abiertos.set(next);
  }

  tieneHijos(id: number): boolean {
    return this.todas().some((row) => row.parent_id === id);
  }

  profundidad(row: Category): number {
    const byId = new Map(this.todas().map((item) => [item.id, item]));
    let depth = 0;
    let parent = row.parent_id;
    while (parent) {
      depth += 1;
      parent = byId.get(parent)?.parent_id ?? null;
      if (depth > 8) break;
    }
    return depth;
  }

  private cargarArbol(): void {
    this.svc.list({ page: 1, perPage: 50 }).pipe(
      switchMap((first) => {
        if (first.meta.last_page <= 1) return of(first.items);
        const rest = Array.from({ length: first.meta.last_page - 1 }, (_, index) => this.svc.list({ page: index + 2, perPage: 50 }));
        return forkJoin(rest).pipe(map((pages) => [first.items, ...pages.map((page) => page.items)].flat()));
      }),
    ).subscribe({
      next: (rows) => {
        this.todas.set(rows);
        if (this.abiertos().size === 0) {
          this.abiertos.set(new Set(rows.filter((row) => row.parent_id == null).map((row) => row.id)));
        }
      },
    });
  }

  private ordenar(rows: Category[], open: ReadonlySet<number>): Category[] {
    const byParent = new Map<number | null, Category[]>();
    for (const row of rows) {
      const key = row.parent_id;
      byParent.set(key, [...(byParent.get(key) ?? []), row]);
    }
    const out: Category[] = [];
    const walk = (parent: number | null): void => {
      for (const row of byParent.get(parent) ?? []) {
        out.push(row);
        if (open.has(row.id)) walk(row.id);
      }
    };
    walk(null);
    return out;
  }
}
