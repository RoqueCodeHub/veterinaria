import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { apiMessage } from '../../../core/api/api-message';
import { PagedList } from '../../../core/api/paged-list';
import { AuditLog, LoginLog } from '../../../core/api/models';
import { AuditService } from '../../../core/services/clinic-reports.service';
import { fechaCorta } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [AdminTable],
  templateUrl: './auditoria.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Auditoria implements OnInit {
  private readonly svc = inject(AuditService);
  private readonly notify = inject(NotifyService);
  readonly tab = signal<'cambios' | 'accesos' | 'respaldos' | 'seguridad'>('cambios');
  readonly cambios = new PagedList<AuditLog>(
    (query) => this.svc.logs(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudo cargar la auditoría.')),
  );
  readonly accesos = new PagedList<LoginLog>(
    (query) => this.svc.logins(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudieron cargar los accesos.')),
  );
  readonly respaldos = signal<{ name: string; size?: number; modified_at?: string }[]>([]);
  readonly seguridad = signal<Record<string, unknown>>({});

  ngOnInit(): void {
    this.cambios.load(1);
    this.accesos.load(1);
    this.svc.backups().subscribe({ next: (rows) => this.respaldos.set(rows) });
    this.svc.security().subscribe({ next: (data) => this.seguridad.set(data) });
  }

  fecha(value: string | null | undefined): string { return fechaCorta(value); }

  tamano(bytes?: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  claves(): string[] {
    return Object.keys(this.seguridad());
  }
}
