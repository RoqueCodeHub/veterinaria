import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api/api-client';
import { Page, PageQuery } from '../api/envelope';
import { Appointment, DashboardReport, Deworming, MedicalRecord, Reminder, Sale, StaffAccount, Vaccination, VetService } from '../api/models';

@Injectable({ providedIn: 'root' })
export class ClinicService {
  private readonly api = inject(ApiClient);

  services(query?: PageQuery): Observable<VetService[] | Page<VetService>> {
    if (query?.page) return this.api.getPage<VetService>('services', query);
    return this.api.getData<VetService[]>('services');
  }

  createService(body: { code: string; name: string; duration_minutes?: number | null; sale_price: number; staff_role?: string; activo?: boolean }): Observable<VetService> {
    return this.api.post<VetService>('services', body);
  }

  updateService(id: number, body: Partial<{ name: string; duration_minutes: number | null; sale_price: number; staff_role: string; activo: boolean }>): Observable<VetService> {
    return this.api.put<VetService>(`services/${id}`, body);
  }

  appointments(query: PageQuery): Observable<Page<Appointment>> {
    return this.api.getPage<Appointment>('appointments', query);
  }

  showAppointment(id: number): Observable<Appointment> {
    return this.api.getData<Appointment>(`appointments/${id}`);
  }

  createAppointment(body: { pet_id: number; clinic_service_id: number; staff_user_id: number; scheduled_at: string; notes?: string | null }): Observable<Appointment> {
    return this.api.post<Appointment>('appointments', body);
  }

  updateAppointment(id: number, body: Partial<{ staff_user_id: number; scheduled_at: string; notes: string | null; clinic_service_id: number }>): Observable<Appointment> {
    return this.api.put<Appointment>(`appointments/${id}`, body);
  }

  cancel(id: number): Observable<Appointment> {
    return this.api.post<Appointment>(`appointments/${id}/cancel`, {});
  }

  attend(id: number, body: { type?: string; diagnostico?: string; tratamiento?: string; peso?: number; examenes?: string; notes?: string }): Observable<MedicalRecord> {
    return this.api.post<MedicalRecord>(`appointments/${id}/attend`, body);
  }

  consume(id: number, variantId: number, quantity: number): Observable<unknown> {
    return this.api.post(`appointments/${id}/consumptions`, { variant_id: variantId, quantity });
  }

  charge(id: number, payments: { method: string; amount: number }[], idempotencyKey?: string): Observable<Sale> {
    return this.api.post<Sale>(`appointments/${id}/charge`, { payments, idempotency_key: idempotencyKey });
  }

  history(petId: number): Observable<Record<string, unknown>> {
    return this.api.getData(`pets/${petId}/clinical-history`);
  }

  createRecord(petId: number, body: { type?: string; diagnostico?: string; tratamiento?: string; peso?: number; examenes?: string; notes?: string; appointment_id?: number }): Observable<MedicalRecord> {
    return this.api.post<MedicalRecord>(`pets/${petId}/medical-records`, body);
  }

  updateRecord(id: number, body: Partial<MedicalRecord>): Observable<MedicalRecord> {
    return this.api.put<MedicalRecord>(`medical-records/${id}`, body);
  }

  attach(id: number, file: File, kind: 'foto' | 'adjunto' = 'adjunto'): Observable<{ id: number }> {
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);
    return this.api.postForm(`medical-records/${id}/attachments`, form);
  }

  downloadAttachment(recordId: number, attachmentId: number): Observable<Blob> {
    return this.api.blob(`medical-records/${recordId}/attachments/${attachmentId}`);
  }

  addVaccination(petId: number, body: { vaccine_name: string; applied_at?: string | null; next_due_at?: string | null }): Observable<Vaccination> {
    return this.api.post<Vaccination>(`pets/${petId}/vaccinations`, body);
  }

  addDeworming(petId: number, body: { product_name: string; applied_at?: string | null; next_due_at?: string | null }): Observable<Deworming> {
    return this.api.post<Deworming>(`pets/${petId}/dewormings`, body);
  }
}

@Injectable({ providedIn: 'root' })
export class RemindersService {
  private readonly api = inject(ApiClient);

  list(query: PageQuery): Observable<Page<Reminder>> {
    return this.api.getPage<Reminder>('reminders', query);
  }

  dismiss(id: number): Observable<Reminder> {
    return this.api.post<Reminder>(`reminders/${id}/dismiss`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly api = inject(ApiClient);

  dashboard(from?: string, to?: string): Observable<DashboardReport> {
    return this.api.getData<DashboardReport>('reports/dashboard', { extra: { from, to } });
  }

  salesByDay(from?: string, to?: string): Observable<{ date: string; sales_count: number; total: number; profit?: number }[]> {
    return this.api.getData('reports/sales-by-day', { extra: { from, to } });
  }

  topProducts(from?: string, to?: string): Observable<{ description: string; quantity: number; total: number }[]> {
    return this.api.getData('reports/top-products', { extra: { from, to } });
  }

  byCategory(from?: string, to?: string): Observable<{ categoria: string; quantity: number; total: number }[]> {
    return this.api.getData('reports/by-category', { extra: { from, to } });
  }

  byCashier(from?: string, to?: string): Observable<{ cajero: string; sales_count: number; total: number }[]> {
    return this.api.getData('reports/by-cashier', { extra: { from, to } });
  }

  profit(from?: string, to?: string): Observable<{ sales_total: number; cost: number; refund_total: number; profit: number; sales_count: number }> {
    return this.api.getData('reports/profit', { extra: { from, to } });
  }

  slowMovers(from?: string, to?: string): Observable<{ variant_id: number; nombre?: string; sku?: string; on_hand?: number }[]> {
    return this.api.getData('reports/slow-movers', { extra: { from, to } });
  }

  inventoryValue(): Observable<{ units: number; value: number }> {
    return this.api.getData('reports/inventory-value');
  }

  export(report: string, format: 'csv' | 'xlsx' | 'pdf', from?: string, to?: string): Observable<Blob> {
    return this.api.blob('reports/export', { extra: { report, format, from, to } });
  }
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly api = inject(ApiClient);

  list(query: PageQuery): Observable<Page<StaffAccount>> {
    return this.api.getPage<StaffAccount>('users', query);
  }

  roles(): Observable<string[]> {
    return this.api.getData<string[]>('roles');
  }

  create(body: { name: string; email: string; password: string; roles: string[]; is_active?: boolean }): Observable<StaffAccount> {
    return this.api.post<StaffAccount>('users', body);
  }

  update(id: number, body: Partial<{ name: string; email: string; password: string; roles: string[]; is_active: boolean }>): Observable<StaffAccount> {
    return this.api.put<StaffAccount>(`users/${id}`, body);
  }

  activate(id: number): Observable<StaffAccount> {
    return this.api.patch<StaffAccount>(`users/${id}/activate`);
  }

  deactivate(id: number): Observable<StaffAccount> {
    return this.api.patch<StaffAccount>(`users/${id}/deactivate`);
  }
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly api = inject(ApiClient);

  logs(query: PageQuery): Observable<Page<import('../api/models').AuditLog>> {
    return this.api.getPage('audit-logs', query);
  }

  logins(query: PageQuery): Observable<Page<import('../api/models').LoginLog>> {
    return this.api.getPage('login-logs', query);
  }

  backups(): Observable<{ name: string; size?: number; modified_at?: string }[]> {
    return this.api.getData('backups');
  }

  security(): Observable<Record<string, unknown>> {
    return this.api.getData('security-status');
  }
}
