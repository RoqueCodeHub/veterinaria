import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoriasService, Categoria, CategoriaForm } from '../../../core/services/categorias.service';

@Component({
    selector: 'app-categorias',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './categorias.html',
    styleUrl: './categorias.css',
})
export class Categorias implements OnInit {
    private svc = inject(CategoriasService);

    categorias = signal<Categoria[]>([]);
    loading = signal(false);
    error = signal<string | null>(null);

    showModal = signal(false);
    editingId = signal<number | null>(null);
    deleteConfirmId = signal<number | null>(null);
    savingModal = signal(false);

    form: CategoriaForm = this.emptyForm();

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.svc.getAll().subscribe({
            next: (data) => { this.categorias.set(data); this.loading.set(false); },
            error: () => { this.error.set('Error al cargar categorías'); this.loading.set(false); }
        });
    }

    openCreate(): void {
        this.form = this.emptyForm();
        this.editingId.set(null);
        this.showModal.set(true);
    }

    openEdit(c: Categoria): void {
        this.form = {
            nombre: c.nombre,
            descripcion: c.descripcion ?? '',
            activo: !!c.activo,
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
            error: () => { this.error.set('Error al guardar la categoría'); this.savingModal.set(false); }
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
            error: () => { this.error.set('Error al eliminar la categoría'); this.deleteConfirmId.set(null); }
        });
    }

    private emptyForm(): CategoriaForm {
        return { nombre: '', descripcion: '', activo: true };
    }
}
