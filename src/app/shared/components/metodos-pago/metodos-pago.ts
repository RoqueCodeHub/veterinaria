import { Component, OnInit, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface MetodoPagoApi {
  id: number;
  nombre: string;
  numero: string | null;
  titular: string | null;
  qr_imagen: string | null;
  instrucciones: string | null;
}

interface MetodoPago extends MetodoPagoApi {
  tipo: 'billetera' | 'banco';
  color: string;
  colorBg: string;
}

// Base de la URL de almacenamiento de Laravel (public disk)
const STORAGE_URL = environment.apiUrl
  .replace('/api/v1', '')
  .replace('/api', '') + '/storage/';

@Component({
  selector: 'app-metodos-pago',
  standalone: true,
  imports: [],
  templateUrl: './metodos-pago.html',
  styleUrl: './metodos-pago.css',
})
export class MetodosPago implements OnInit {
  private http = inject(HttpClient);

  metodos = signal<MetodoPago[]>([]);
  isLoading = signal(true);
  copied = signal(false);
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit() {
    this.http.get<{ data: MetodoPagoApi[] }>(`${environment.apiUrl}/metodos-pago`).subscribe({
      next: (res) => {
        this.metodos.set(res.data.map(m => ({
          ...m,
          tipo: this.getTipo(m.nombre),
          color: this.getColor(m.nombre),
          colorBg: this.getColorBg(m.nombre),
        })));
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  qrUrl(path: string | null): string | null {
    if (!path) return null;
    return path.startsWith('http') ? path : STORAGE_URL + path;
  }

  copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.copied.set(true);
      this.toastTimer = setTimeout(() => this.copied.set(false), 2000);
    });
  }

  private getTipo(nombre: string): 'billetera' | 'banco' {
    const n = nombre.toLowerCase();
    if (n.includes('yape') || n.includes('plin')) return 'billetera';
    return 'banco';
  }

  private getColor(nombre: string): string {
    const n = nombre.toLowerCase();
    if (n.includes('yape')) return '#7B2FBE';
    if (n.includes('plin')) return '#00B4D8';
    return '#2A168C';
  }

  private getColorBg(nombre: string): string {
    const n = nombre.toLowerCase();
    if (n.includes('yape')) return 'rgba(123, 47, 190, 0.12)';
    if (n.includes('plin')) return 'rgba(0, 180, 216, 0.12)';
    return 'rgba(42, 22, 140, 0.12)';
  }
}
