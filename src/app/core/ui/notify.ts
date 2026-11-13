import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class NotifyService {
  private messages = inject(MessageService);

  success(detail: string, summary = 'Listo'): void {
    this.messages.add({ severity: 'success', summary, detail, life: 4000 });
  }

  info(detail: string, summary = 'Aviso'): void {
    this.messages.add({ severity: 'info', summary, detail, life: 4000 });
  }

  warn(detail: string, summary = 'Atención'): void {
    this.messages.add({ severity: 'warn', summary, detail, life: 5000 });
  }

  error(detail: string, summary = 'No se pudo completar'): void {
    if (detail === 'No autenticado') return;
    this.messages.add({ severity: 'error', summary, detail, life: 5500 });
  }
}
