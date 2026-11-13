import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { apiMessage } from '../../core/api/api-message';
import { Appointment, Deworming, Pet, PortalProfile, Sale, Vaccination, VetService } from '../../core/api/models';
import { PortalService } from '../../core/services/portal.service';
import { NotifyService } from '../../core/ui/notify';
import { AdminTable } from '../../shared/components/admin-table/admin-table';

@Component({
  selector: 'app-portal-home',
  standalone: true,
  imports: [DecimalPipe, FormsModule, AdminTable],
  templateUrl: './portal-home.html',
})
export class PortalHome implements OnInit {
  private readonly svc = inject(PortalService);
  private readonly notify = inject(NotifyService);
  readonly tab = signal<'perfil' | 'mascotas' | 'citas' | 'compras' | 'servicios'>('perfil');
  readonly profile = signal<PortalProfile | null>(null);
  readonly pets = signal<Pet[]>([]);
  readonly petTotal = signal(0);
  readonly petPage = signal(1);
  readonly carnet = signal<{ pet: Pet; vaccinations: Vaccination[]; dewormings: Deworming[] } | null>(null);
  readonly upcoming = signal<Appointment[]>([]);
  readonly appointments = signal<Appointment[]>([]);
  readonly purchases = signal<Sale[]>([]);
  readonly purchaseTotal = signal(0);
  readonly purchasePage = signal(1);
  readonly services = signal<VetService[]>([]);
  solicitud = { pet_id: null as number | null, clinic_service_id: null as number | null, scheduled_at: '', notes: '' };

  ngOnInit(): void {
    this.svc.me().subscribe({
      next: (profile) => this.profile.set(profile),
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo cargar el perfil.')),
    });
    this.cargarMascotas();
    this.svc.appointments().subscribe({ next: (data) => { this.upcoming.set(data.upcoming); this.appointments.set(data.all); } });
    this.cargarCompras();
    this.svc.services().subscribe({ next: (rows) => this.services.set(rows) });
  }

  cargarMascotas(): void {
    this.svc.pets({ page: this.petPage(), perPage: 10 }).subscribe({
      next: (page) => { this.pets.set(page.items); this.petTotal.set(page.meta.total); },
    });
  }

  verCarnet(pet: Pet): void {
    this.svc.carnet(pet.id).subscribe({
      next: (data) => this.carnet.set(data),
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo abrir el carné.')),
    });
  }

  cargarCompras(): void {
    this.svc.purchases({ page: this.purchasePage(), perPage: 10 }).subscribe({
      next: (page) => { this.purchases.set(page.items); this.purchaseTotal.set(page.meta.total); },
    });
  }

  pedirCita(): void {
    if (!this.solicitud.pet_id || !this.solicitud.clinic_service_id || !this.solicitud.scheduled_at) return;
    this.svc.requestAppointment({
      pet_id: this.solicitud.pet_id,
      clinic_service_id: this.solicitud.clinic_service_id,
      scheduled_at: this.solicitud.scheduled_at,
      notes: this.solicitud.notes,
    }).subscribe({
      next: () => { this.notify.success('Solicitud enviada.'); this.svc.appointments().subscribe({ next: (data) => { this.upcoming.set(data.upcoming); this.appointments.set(data.all); } }); },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo solicitar la cita.')),
    });
  }
}
