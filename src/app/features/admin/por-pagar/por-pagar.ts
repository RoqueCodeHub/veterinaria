import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { apiMessage } from '../../../core/api/api-message';
import { PagedList } from '../../../core/api/paged-list';
import { Purchase } from '../../../core/api/models';
import { AuthService } from '../../../core/auth/auth';
import { PurchasesService } from '../../../core/services/commerce.service';
import { fechaCorta, soles } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';

@Component({
  selector: 'app-por-pagar',
  standalone: true,
  imports: [FormsModule, Button, Dialog, InputText, Select, AdminTable],
  templateUrl: './por-pagar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PorPagar implements OnInit {
  private readonly svc = inject(PurchasesService);
  private readonly notify = inject(NotifyService);
  readonly auth = inject(AuthService);
  readonly list = new PagedList<Purchase>(
    (query) => this.svc.payables(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudieron cargar las cuentas.')),
  );
  readonly pago = signal<Purchase | null>(null);
  readonly saving = signal(false);
  amount: number | null = null;
  method = 'efectivo';
  readonly metodos = [
    { label: 'Efectivo', value: 'efectivo' },
    { label: 'Transferencia', value: 'transferencia' },
    { label: 'Yape', value: 'yape' },
  ];

  ngOnInit(): void { this.list.load(1); }

  abrir(row: Purchase): void {
    this.pago.set(row);
    this.amount = Number(row.balance);
    this.method = 'efectivo';
  }

  guardar(): void {
    const row = this.pago();
    if (!row || !this.amount || this.amount <= 0) {
      this.notify.warn('Indica el monto a pagar.');
      return;
    }
    this.saving.set(true);
    this.svc.pay(row.id, { amount: this.amount, method: this.method }).subscribe({
      next: () => {
        this.saving.set(false);
        this.pago.set(null);
        this.notify.success('Pago registrado.');
        this.list.load();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo registrar el pago.'));
      },
    });
  }

  vencido(row: Purchase): boolean {
    return !!row.due_date && row.due_date.slice(0, 10) < new Date().toISOString().slice(0, 10);
  }

  soles(value: string | number | null | undefined): string { return soles(value); }
  fecha(value: string | null): string { return fechaCorta(value); }
}
