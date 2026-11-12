import { ChangeDetectionStrategy, Component, effect, inject, input, model, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Dialog } from 'primeng/dialog';
import { VentasService } from '../../../core/services/ventas.service';
import { NotifyService } from '../../../core/ui/notify';

@Component({
  selector: 'app-ticket-viewer',
  standalone: true,
  imports: [Dialog],
  templateUrl: './ticket-viewer.html',
  styleUrl: './ticket-viewer.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketViewer {
  private ventas = inject(VentasService);
  private sanitizer = inject(DomSanitizer);
  private notify = inject(NotifyService);

  readonly visible = model(false);
  readonly ventaId = input<number | null>(null);
  readonly url = signal<SafeResourceUrl | null>(null);
  readonly cargando = signal(false);

  private objectUrl: string | null = null;
  private cargado: number | null = null;

  constructor() {
    effect(() => {
      const abierto = this.visible();
      const id = this.ventaId();
      if (!abierto) {
        this.liberar();
        return;
      }
      if (!id || id === this.cargado) return;
      this.cargar(id);
    });
  }

  cerrar(): void {
    this.visible.set(false);
  }

  private cargar(id: number): void {
    this.cargado = id;
    this.cargando.set(true);
    this.ventas.ticket(id).subscribe({
      next: (blob) => {
        this.liberar(false);
        this.objectUrl = URL.createObjectURL(blob);
        this.url.set(this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl));
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.cargado = null;
        this.notify.error('No se pudo abrir el ticket.');
        this.visible.set(false);
      },
    });
  }

  private liberar(resetCarga = true): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    this.url.set(null);
    if (resetCarga) this.cargado = null;
  }
}
