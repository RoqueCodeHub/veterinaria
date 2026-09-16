import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientesService, Cliente, ClienteForm } from '../../../core/services/clientes.service';

@Component({
    selector: 'app-clientes',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './clientes.html',
    styleUrl: './clientes.css',
})
export class Clientes implements OnInit {
    private svc = inject(ClientesService);

    clientes = signal<Cliente[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    showModal = signal(false);
    editingId = signal<number | null>(null);
    deleteConfirmId = signal<number | null>(null);
    savingModal = signal(false);

    form: ClienteForm = this.emptyForm();

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.svc.getAll().subscribe({
            next: (data) => { this.clientes.set(data); this.loading.set(false); },
            error: () => { this.error.set('Error al cargar clientes'); this.loading.set(false); }
        });
    }

    openCreate(): void {
        this.form = this.emptyForm();
        this.editingId.set(null);
        this.showModal.set(true);
    }

    openEdit(c: Cliente): void {
        this.form = {
            nombres: c.nombres,
            apellidos: c.apellidos,
            tipo_documento: c.tipo_documento ?? '',
            numero_documento: c.numero_documento ?? '',
            telefono: c.telefono ?? '',
            email: c.email ?? '',
            direccion: c.direccion ?? '',
            activo: c.activo,
            observaciones: c.observaciones ?? '',
        };
        this.editingId.set(c.id);
        this.showModal.set(true);
    }

    closeModal(): void {
        this.showModal.set(false);
        this.savingModal.set(false);
    }

    save(): void {
        this.savingModal.set(true);
        const id = this.editingId();
        const obs = id ? this.svc.update(id, this.form) : this.svc.create(this.form);
        obs.subscribe({
            next: () => { this.closeModal(); this.load(); },
            error: () => { this.error.set('Error al guardar el cliente'); this.savingModal.set(false); }
        });
    }

    confirmDelete(id: number): void {
        this.deleteConfirmId.set(id);
    }

    cancelDelete(): void {
        this.deleteConfirmId.set(null);
    }

    doDelete(): void {
        const id = this.deleteConfirmId()!;
        this.svc.delete(id).subscribe({
            next: () => { this.deleteConfirmId.set(null); this.load(); },
            error: () => { this.error.set('Error al eliminar el cliente'); this.deleteConfirmId.set(null); }
        });
    }

    private emptyForm(): ClienteForm {
        return {
            nombres: '',
            apellidos: '',
            tipo_documento: 'DNI',
            numero_documento: '',
            telefono: '',
            email: '',
            direccion: '',
            activo: true,
            observaciones: '',
        };
    }
}
