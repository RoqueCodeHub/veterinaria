import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VentasService, Venta } from '../../../core/services/ventas.service';

@Component({
    selector: 'app-caja',
    standalone: true,
    imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
    templateUrl: './caja.html',
    styleUrl: './caja.css',
})
export class Caja implements OnInit {
    private svc = inject(VentasService);

    pendientes = signal<Venta[]>([]);
    seleccionId = signal<number | null>(null);
    loading = signal(false);
    saving = signal(false);
    cancelando = signal(false);
    error = signal<string | null>(null);
    aviso = signal<string | null>(null);
    metodoPago = 'efectivo';
    montoRecibido: number | null = null;

    readonly metodos = [
        { id: 'efectivo', label: 'Efectivo' },
        { id: 'yape', label: 'Yape' },
        { id: 'plin', label: 'Plin' },
        { id: 'tarjeta', label: 'Tarjeta' },
        { id: 'transferencia', label: 'Transferencia' },
    ];

    seleccion = computed(() => this.pendientes().find(v => v.id === this.seleccionId()) ?? null);

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.svc.getAll('pendiente').subscribe({
            next: (data) => {
                this.pendientes.set(data);
                if (!data.some(v => v.id === this.seleccionId())) {
                    this.seleccionId.set(data[0]?.id ?? null);
                    this.montoRecibido = null;
                }
                this.loading.set(false);
            },
            error: () => {
                this.error.set('No se pudieron cargar las ventas pendientes');
                this.loading.set(false);
            },
        });
    }

    elegir(id: number): void {
        this.seleccionId.set(id);
        this.montoRecibido = null;
        this.aviso.set(null);
        this.error.set(null);
    }

    totalDe(v: Venta): number {
        return parseFloat(String(v.total ?? 0)) || 0;
    }

    montoCobro(): number {
        const venta = this.seleccion();
        if (!venta) return 0;
        const ingresado = Number(this.montoRecibido);
        return ingresado > 0 ? ingresado : this.totalDe(venta);
    }

    vuelto(): number {
        const venta = this.seleccion();
        if (!venta || this.metodoPago !== 'efectivo') return 0;
        return Math.max(0, this.montoCobro() - this.totalDe(venta));
    }

    cobrar(): void {
        const venta = this.seleccion();
        if (!venta) {
            this.error.set('Selecciona una venta pendiente.');
            return;
        }
        const total = this.totalDe(venta);
        const monto = this.montoCobro();
        if (monto + 0.001 < total) {
            this.error.set('El monto recibido no cubre el total.');
            return;
        }
        this.saving.set(true);
        this.error.set(null);
        this.aviso.set(null);
        this.svc.cobrar(venta.id, { metodo_pago: this.metodoPago, monto_pagado: monto }).subscribe({
            next: () => {
                this.aviso.set(`Venta #${venta.id} cobrada.`);
                this.saving.set(false);
                this.montoRecibido = null;
                this.load();
            },
            error: (err) => {
                this.error.set(err?.error?.message || 'No se pudo cobrar');
                this.saving.set(false);
            },
        });
    }

    cancelar(): void {
        const venta = this.seleccion();
        if (!venta) return;
        this.cancelando.set(true);
        this.error.set(null);
        this.aviso.set(null);
        this.svc.anular(venta.id).subscribe({
            next: (res) => {
                this.aviso.set(res?.message || `Venta #${venta.id} cancelada.`);
                this.cancelando.set(false);
                this.montoRecibido = null;
                this.load();
            },
            error: (err) => {
                this.error.set(err?.error?.message || 'No se pudo cancelar');
                this.cancelando.set(false);
            },
        });
    }
}
