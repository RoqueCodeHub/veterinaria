import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api/api-client';
import { Page, PageQuery } from '../api/envelope';
import { Appointment, Deworming, Pet, PortalProfile, Sale, Vaccination, VetService } from '../api/models';

@Injectable({ providedIn: 'root' })
export class PortalService {
  private readonly api = inject(ApiClient);

  me(): Observable<PortalProfile> {
    return this.api.getData<PortalProfile>('portal/me');
  }

  pets(query: PageQuery): Observable<Page<Pet>> {
    return this.api.getPage<Pet>('portal/pets', query);
  }

  carnet(petId: number): Observable<{ pet: Pet; vaccinations: Vaccination[]; dewormings: Deworming[] }> {
    return this.api.getData(`portal/pets/${petId}/carnet`);
  }

  appointments(): Observable<{ upcoming: Appointment[]; all: Appointment[] }> {
    return this.api.getData('portal/appointments');
  }

  requestAppointment(body: { pet_id: number; clinic_service_id: number; scheduled_at: string; notes?: string }): Observable<Appointment> {
    return this.api.post<Appointment>('portal/appointments', body);
  }

  purchases(query: PageQuery): Observable<Page<Sale>> {
    return this.api.getPage<Sale>('portal/purchases', query);
  }

  services(): Observable<VetService[]> {
    return this.api.getData<VetService[]>('portal/services');
  }
}
