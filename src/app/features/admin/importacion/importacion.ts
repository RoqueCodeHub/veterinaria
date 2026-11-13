import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { apiMessage, saveBlob } from '../../../core/api/api-message';
import { PagedList } from '../../../core/api/paged-list';
import { Variant } from '../../../core/api/models';
import { InventoryService } from '../../../core/services/inventory.service';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';

@Component({
  selector: 'app-importacion',
  standalone: true,
  imports: [FormsModule, Button, Dialog, InputText, AdminTable],
  templateUrl: './importacion.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Importacion implements OnInit {
  private readonly svc = inject(InventoryService);
  private readonly notify = inject(NotifyService);
  readonly list = new PagedList<Variant>(
    (query) => this.svc.pending(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudieron cargar los pendientes.')),
  );
  readonly modal = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<Variant | null>(null);
  form = { presentation: '', sku: '', sale_price: null as number | null };

  ngOnInit(): void { this.list.load(1); }

  plantilla(): void {
    this.svc.template().subscribe({
      next: (blob) => saveBlob(blob, 'plantilla-inventario.csv'),
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo descargar la plantilla.')),
    });
  }

  cargar(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.saving.set(true);
    this.svc.importFile(file).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('Archivo importado. Revisa los pendientes.');
        this.list.load(1);
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo importar el archivo.'));
      },
    });
  }

  abrir(row: Variant): void {
    this.editing.set(row);
    this.form = {
      presentation: row.presentation ?? '',
      sku: row.sku ?? '',
      sale_price: row.sale_price == null ? null : Number(row.sale_price),
    };
    this.modal.set(true);
  }

  guardar(): void {
    const row = this.editing();
    if (!row) return;
    this.saving.set(true);
    this.svc.resolvePending(row.id, {
      presentation: this.form.presentation,
      sku: this.form.sku,
      sale_price: this.form.sale_price,
      needs_review: false,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.modal.set(false);
        this.notify.success('Pendiente actualizado.');
        this.list.load();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo guardar el pendiente.'));
      },
    });
  }
}
