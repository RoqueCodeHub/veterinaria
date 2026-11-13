import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { map } from 'rxjs';
import { apiMessage } from '../../../core/api/api-message';
import { PagedList } from '../../../core/api/paged-list';
import { Product, ProductForm, VariantForm } from '../../../core/api/models';
import { BrandsService, CategoriesService, ProductsService } from '../../../core/services/catalog.service';
import { SuppliersService } from '../../../core/services/parties.service';
import { AuthService } from '../../../core/auth/auth';
import { clearError, soles } from '../../../core/ui/format';
import { NotifyService } from '../../../core/ui/notify';
import { AdminTable } from '../../../shared/components/admin-table/admin-table';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { RemoteOption, RemoteSelect } from '../../../shared/components/remote-select/remote-select';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [FormsModule, Button, Checkbox, Dialog, InputText, Select, AdminTable, ConfirmDialog, RemoteSelect],
  templateUrl: './productos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Productos implements OnInit {
  private readonly svc = inject(ProductsService);
  private readonly categories = inject(CategoriesService);
  private readonly brands = inject(BrandsService);
  private readonly suppliers = inject(SuppliersService);
  private readonly notify = inject(NotifyService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);
  readonly list = new PagedList<Product>(
    (query) => this.svc.list(query),
    (error) => this.notify.error(apiMessage(error as HttpErrorResponse, 'No se pudieron cargar los productos.')),
  );
  readonly modal = signal(false);
  readonly saving = signal(false);
  readonly editing = signal<Product | null>(null);
  readonly quitar = signal<Product | null>(null);
  readonly errors = signal<Record<string, string>>({});
  readonly estados = [
    { label: 'Todos los estados', value: '' },
    { label: 'Activos', value: '1' },
    { label: 'Inactivos', value: '0' },
  ];
  categoria: number | null = null;
  marca: number | null = null;
  estado = '';
  form: ProductForm = this.vacio();
  variante: VariantForm = { presentation: '', sale_price: null, sku: '' };

  readonly buscarCategorias = (term: string) => this.categories.list({ page: 1, perPage: 20, q: term }).pipe(
    map((page) => page.items.map((row): RemoteOption => ({ id: row.id, label: row.nombre }))),
  );
  readonly buscarMarcas = (term: string) => this.brands.list({ page: 1, perPage: 20, q: term }).pipe(
    map((page) => page.items.map((row): RemoteOption => ({ id: row.id, label: row.nombre }))),
  );
  readonly buscarProveedores = (term: string) => this.suppliers.list({ page: 1, perPage: 20, q: term }).pipe(
    map((page) => page.items.map((row): RemoteOption => ({ id: row.id, label: row.name }))),
  );

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap.get('q');
    if (q) this.list.q.set(q);
    this.list.load(1);
  }

  buscar(event: Event): void {
    this.list.search((event.target as HTMLInputElement).value);
  }

  filtrar(): void {
    this.list.extra = {
      category_id: this.categoria || undefined,
      marca_id: this.marca || undefined,
      activo: this.estado || undefined,
    };
    this.list.load(1);
  }

  abrir(row?: Product): void {
    this.errors.set({});
    this.variante = { presentation: '', sale_price: null, sku: '' };
    this.editing.set(row ?? null);
    this.form = row ? {
      nombre: row.nombre,
      descripcion: row.descripcion,
      codigo: row.codigo,
      categoria_id: row.categoria_id,
      marca_id: row.marca_id,
      proveedor_id: row.proveedor_id,
      presentacion: row.presentacion,
      precio_compra: row.precio_compra == null ? null : Number(row.precio_compra),
      precio_venta: row.precio_venta == null ? null : Number(row.precio_venta),
      stock_minimo: row.stock_minimo == null ? null : Number(row.stock_minimo),
      unidad_medida: row.unidad_medida,
      fecha_vencimiento: row.fecha_vencimiento?.slice(0, 10) ?? null,
      requiere_receta: row.requiere_receta,
      requires_batch: row.requires_batch,
      activo: row.activo,
    } : this.vacio();
    this.modal.set(true);
  }

  limpiar(key: string): void {
    this.errors.update((current) => clearError(current, key));
  }

  guardar(): void {
    const errors: Record<string, string> = {};
    if (!this.form.nombre.trim()) errors['nombre'] = 'Escribe el nombre del producto.';
    this.errors.set(errors);
    if (Object.keys(errors).length) return;
    this.saving.set(true);
    const id = this.editing()?.id;
    const request = id ? this.svc.update(id, this.form) : this.svc.create(this.form);
    request.subscribe({
      next: (product) => {
        const sku = this.variante.sku?.trim();
        if (!sku) {
          this.cerrarGuardado(id ? 'Producto actualizado.' : 'Producto creado.');
          return;
        }
        this.svc.addVariant(product.id, { ...this.variante, sale_price: this.variante.sale_price ?? Number(this.form.precio_venta ?? 0) }).subscribe({
          next: () => this.cerrarGuardado('Producto y variante guardados.'),
          error: (error: HttpErrorResponse) => {
            this.saving.set(false);
            this.notify.error(apiMessage(error, 'El producto se guardó, pero la variante no.'));
          },
        });
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.notify.error(apiMessage(error, 'No se pudo guardar el producto.'));
      },
    });
  }

  confirmarQuitar(): void {
    const row = this.quitar();
    if (!row) return;
    this.svc.remove(row.id).subscribe({
      next: () => {
        this.notify.success('Producto quitado del catálogo.');
        this.quitar.set(null);
        this.list.load();
      },
      error: (error: HttpErrorResponse) => this.notify.error(apiMessage(error, 'No se pudo quitar el producto.')),
    });
  }

  soles(value: string | number | null | undefined): string { return soles(value); }

  private cerrarGuardado(message: string): void {
    this.saving.set(false);
    this.modal.set(false);
    this.notify.success(message);
    this.list.load();
  }

  private vacio(): ProductForm {
    return {
      nombre: '',
      categoria_id: null,
      marca_id: null,
      proveedor_id: null,
      activo: true,
      requiere_receta: false,
      requires_batch: true,
    };
  }
}
