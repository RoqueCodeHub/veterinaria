import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProveedoresService, Proveedor, ProveedorForm } from '../../../core/services/proveedores.service';

@Component({
    selector: 'app-proveedores',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './proveedores.html',
    styleUrl: './proveedores.css',
})
export class Proveedores implements OnInit {
    private svc = inject(ProveedoresService);

    proveedores = signal<Proveedor[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    showModal = signal(false);
    editingId = signal<number | null>(null);
    deleteConfirmId = signal<number | null>(null);
    savingModal = signal(false);

    form: ProveedorForm = this.emptyForm();

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.svc.getAll().subscribe({
            next: (data) => { this.proveedores.set(data); this.loading.set(false); },
            error: () => { this.error.set('Error al cargar proveedores'); this.loading.set(false); }
        });
    }

    openCreate(): void {
        this.form = this.emptyForm();
        this.editingId.set(null);
        this.showModal.set(true);
    }

    openEdit(p: Proveedor): void {
        this.form = {
            nombres: p.nombres,
            apellidos: p.apellidos,
            tipo_documento: p.tipo_documento ?? '',
            numero_documento: p.numero_documento ?? '',
            telefono: p.telefono ?? '',
            email: p.email ?? '',
            direccion: p.direccion ?? '',
            empresa: p.empresa ?? '',
            activo: p.activo,
        };
        this.editingId.set(p.id);
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
            error: () => { this.error.set('Error al guardar el proveedor'); this.savingModal.set(false); }
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
            error: () => { this.error.set('Error al eliminar el proveedor'); this.deleteConfirmId.set(null); }
        });
    }

    private emptyForm(): ProveedorForm {
        return {
            nombres: '',
            apellidos: '',
            tipo_documento: 'DNI',
            numero_documento: '',
            telefono: '',
            email: '',
            direccion: '',
            empresa: '',
            activo: true,
        };
    }
}
