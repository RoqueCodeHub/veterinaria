import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { map } from 'rxjs';
import { apiMessage, saveBlob } from '../../../core/api/api-message';
import { Deworming, MedicalRecord, Vaccination } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth';
import { ClinicService } from '../../../core/services/clinic-reports.service';
import { PetsService } from '../../../core/services/parties.service';
import { fechaCorta } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';
import { RemoteOption, RemoteSelect } from '../../../shared/components/remote-select/remote-select';

@Component({
  selector: 'app-historia',
  standalone: true,
  imports: [FormsModule, Button, Dialog, InputText, AdminTable, RemoteSelect],
  templateUrl: './historia.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Historia {
  private readonly svc = inject(ClinicService);
  private readonly pets = inject(PetsService);
  private readonly notify = inject(NotifyService);
  readonly auth = inject(AuthService);
  readonly petId = signal<number | null>(null);
  readonly tab = signal<'notas' | 'vacunas' | 'desparasitaciones'>('notas');
  readonly notas = signal<MedicalRecord[]>([]);
  readonly vacunas = signal<Vaccination[]>([]);
  readonly desparasitaciones = signal<Deworming[]>([]);
  readonly modal = signal<'nota' | 'vacuna' | 'desparasitacion' | null>(null);
  nota = { diagnostico: '', tratamiento: '', notes: '' };
  vacuna = { vaccine_name: '', applied_at: '', next_due_at: '' };
  desparasitacion = { product_name: '', applied_at: '', next_due_at: '' };
  readonly buscarMascotas = (term: string) => this.pets.list({ page: 1, perPage: 20, q: term }).pipe(
    map((page) => page.items.map((row): RemoteOption => ({ id: row.id, label: row.nombre }))),
  );

  elegir(id: number | null | undefined): void {
    this.petId.set(id ?? null);
    if (!id) return;
    this.svc.history(id).subscribe({
      next: (data) => {
        const historia = data as { records?: MedicalRecord[]; vaccinations?: Vaccination[]; dewormings?: Deworming[] };
        this.notas.set(historia.records ?? []);
        this.vacunas.set(historia.vaccinations ?? []);
        this.desparasitaciones.set(historia.dewormings ?? []);
      },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo cargar la historia.')),
    });
  }

  guardarNota(): void {
    const petId = this.petId();
    if (!petId || !this.nota.diagnostico.trim()) {
      this.notify.warn('Escribe el diagnóstico.');
      return;
    }
    this.svc.createRecord(petId, this.nota).subscribe({
      next: () => { this.modal.set(null); this.notify.success('Nota registrada.'); this.elegir(petId); },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo guardar la nota.')),
    });
  }

  guardarVacuna(): void {
    const petId = this.petId();
    if (!petId || !this.vacuna.vaccine_name.trim()) {
      this.notify.warn('Escribe la vacuna.');
      return;
    }
    this.svc.addVaccination(petId, this.vacuna).subscribe({
      next: () => { this.modal.set(null); this.notify.success('Vacuna registrada.'); this.elegir(petId); },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo guardar la vacuna.')),
    });
  }

  guardarDesparasitacion(): void {
    const petId = this.petId();
    if (!petId || !this.desparasitacion.product_name.trim()) {
      this.notify.warn('Escribe el producto.');
      return;
    }
    this.svc.addDeworming(petId, this.desparasitacion).subscribe({
      next: () => { this.modal.set(null); this.notify.success('Desparasitación registrada.'); this.elegir(petId); },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo guardar la desparasitación.')),
    });
  }

  adjuntar(row: MedicalRecord, event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.svc.attach(row.id, file).subscribe({
      next: () => { this.notify.success('Adjunto guardado.'); const id = this.petId(); if (id) this.elegir(id); },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo adjuntar el archivo.')),
    });
  }

  descargar(row: MedicalRecord, attachmentId: number, name: string | null): void {
    this.svc.downloadAttachment(row.id, attachmentId).subscribe({
      next: (blob) => saveBlob(blob, name || 'adjunto'),
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo descargar el adjunto.')),
    });
  }

  fecha(value: string | null | undefined): string { return fechaCorta(value); }
}
