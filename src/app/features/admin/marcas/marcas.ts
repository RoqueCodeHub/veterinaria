import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { apiMessage } from '../../../core/api/api-message';
import { PagedList } from '../../../core/api/paged-list';
import { Brand } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth';
import { BrandsService } from '../../../core/services/catalog.service';
import { clearError } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';

@Component({
  selector: 'app-marcas',
  standalone: true,
  imports: [FormsModule, Button, Checkbox, Dialog, InputText, AdminTable],
  templateUrl: './marcas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Marcas implements OnInit {
  private readonly svc = inject(BrandsService);
  private readonly notify = inject(NotifyService);
  readonly auth = inject(AuthService);
  readonly list = new PagedList<Brand>(
    (query) => this.svc.list(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudieron cargar las marcas.')),
  );
  readonly modal = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<Brand | null>(null);
  readonly errors = signal<Record<string, string>>({});
  form = { nombre: '', activo: true };

  ngOnInit(): void { this.list.load(1); }

  buscar(event: Event): void {
    this.list.search((event.target as HTMLInputElement).value);
  }

  abrir(row?: Brand): void {
    this.errors.set({});
    this.editing.set(row ?? null);
    this.form = { nombre: row?.nombre ?? '', activo: row?.activo ?? true };
    this.modal.set(true);
  }

  guardar(): void {
    if (!this.form.nombre.trim()) {
      this.errors.set({ nombre: 'Escribe el nombre de la marca.' });
      return;
    }
    this.saving.set(true);
    const id = this.editing()?.id;
    const request = id ? this.svc.update(id, this.form) : this.svc.create(this.form);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modal.set(false);
        this.notify.success(id ? 'Marca actualizada.' : 'Marca creada.');
        this.list.load();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo guardar la marca.'));
      },
    });
  }

  limpiar(): void { this.errors.update((current) => clearError(current, 'nombre')); }
}
