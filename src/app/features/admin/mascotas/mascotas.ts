import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { map } from 'rxjs';
import { apiMessage, saveBlob } from '../../../core/api/api-message';
import { PagedList } from '../../../core/api/paged-list';
import { Pet, PetForm } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth';
import { CustomersService, PetsService } from '../../../core/services/parties.service';
import { clearError } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { RemoteOption, RemoteSelect } from '../../../shared/components/remote-select/remote-select';

@Component({
  selector: 'app-mascotas',
  standalone: true,
  imports: [FormsModule, Button, Dialog, InputText, Select, AdminTable, ConfirmDialog, RemoteSelect],
  templateUrl: './mascotas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Mascotas implements OnInit {
  private readonly svc = inject(PetsService);
  private readonly customers = inject(CustomersService);
  private readonly notify = inject(NotifyService);
  readonly auth = inject(AuthService);
  readonly list = new PagedList<Pet>(
    (query) => this.svc.list(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudieron cargar las mascotas.')),
  );
  readonly modal = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<Pet | null>(null);
  readonly quitar = signal<Pet | null>(null);
  readonly errors = signal<Record<string, string>>({});
  especie = '';
  form: PetForm & { cliente_id: number | null } = { nombre: '', cliente_id: null, especie: 'canino' };
  readonly especies = [
    { label: 'Todas las especies', value: '' },
    { label: 'Canino', value: 'canino' },
    { label: 'Felino', value: 'felino' },
    { label: 'Ave', value: 'ave' },
    { label: 'Otra', value: 'otra' },
  ];
  readonly buscarTutores = (term: string) => this.customers.list({ page: 1, perPage: 20, q: term }).pipe(
    map((page) => page.items.map((row): RemoteOption => ({ id: row.id, label: row.name }))),
  );

  ngOnInit(): void { this.list.load(1); }

  buscar(event: Event): void { this.list.search((event.target as HTMLInputElement).value); }

  filtrar(): void {
    this.list.extra = { especie: this.especie || undefined };
    this.list.load(1);
  }

  abrir(row?: Pet): void {
    this.errors.set({});
    this.editing.set(row ?? null);
    this.form = row
      ? { cliente_id: row.cliente_id, nombre: row.nombre, especie: row.especie, raza: row.raza, sexo: row.sexo, fecha_nacimiento: row.fecha_nacimiento?.slice(0, 10), peso: row.peso == null ? null : Number(row.peso), alergias: row.alergias }
      : { nombre: '', cliente_id: null, especie: 'canino' };
    this.modal.set(true);
  }

  limpiar(key: string): void { this.errors.update((current) => clearError(current, key)); }

  guardar(): void {
    const errors: Record<string, string> = {};
    if (!this.form.nombre.trim()) errors['nombre'] = 'Escribe el nombre de la mascota.';
    if (!this.form.cliente_id) errors['cliente_id'] = 'Elige el tutor.';
    this.errors.set(errors);
    if (Object.keys(errors).length) return;
    this.saving.set(true);
    const id = this.editing()?.id;
    const request = id ? this.svc.update(id, this.form) : this.svc.create(this.form);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.modal.set(false);
        this.notify.success(id ? 'Mascota actualizada.' : 'Mascota creada.');
        this.list.load();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo guardar la mascota.'));
      },
    });
  }

  foto(row: Pet, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.svc.uploadPhoto(row.id, file).subscribe({
      next: () => { this.notify.success('Foto actualizada.'); this.list.load(); },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo subir la foto.')),
    });
  }

  descargar(row: Pet): void {
    this.svc.downloadPhoto(row.id).subscribe({
      next: (blob) => saveBlob(blob, `mascota-${row.id}.jpg`),
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo descargar la foto.')),
    });
  }

  confirmar(): void {
    const row = this.quitar();
    if (!row) return;
    this.svc.remove(row.id).subscribe({
      next: () => {
        this.notify.success('Mascota eliminada.');
        this.quitar.set(null);
        this.list.load();
      },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo eliminar la mascota.')),
    });
  }
}
