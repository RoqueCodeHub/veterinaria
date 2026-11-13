import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api/api-client';
import { Page, PageQuery } from '../api/envelope';
import { Brand, Category, CategoryForm, Product, ProductForm, Variant, VariantForm } from '../api/models';

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private readonly api = inject(ApiClient);

  list(query: PageQuery): Observable<Page<Category>> {
    return this.api.getPage<Category>('categories', { ...query, extra: { flat: 1, ...(query.extra ?? {}) } });
  }

  create(body: CategoryForm): Observable<Category> {
    return this.api.post<Category>('categories', body);
  }

  update(id: number, body: Partial<CategoryForm>): Observable<Category> {
    return this.api.put<Category>(`categories/${id}`, body);
  }

  remove(id: number): Observable<null> {
    return this.api.delete<null>(`categories/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class BrandsService {
  private readonly api = inject(ApiClient);

  list(query: PageQuery): Observable<Page<Brand>> {
    return this.api.getPage<Brand>('brands', query);
  }

  create(body: { nombre: string; activo?: boolean }): Observable<Brand> {
    return this.api.post<Brand>('brands', body);
  }

  update(id: number, body: { nombre?: string; activo?: boolean }): Observable<Brand> {
    return this.api.put<Brand>(`brands/${id}`, body);
  }
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly api = inject(ApiClient);

  list(query: PageQuery): Observable<Page<Product>> {
    return this.api.getPage<Product>('products', query);
  }

  show(id: number): Observable<Product> {
    return this.api.getData<Product>(`products/${id}`);
  }

  create(body: ProductForm): Observable<Product> {
    return this.api.post<Product>('products', body);
  }

  update(id: number, body: Partial<ProductForm>): Observable<Product> {
    return this.api.put<Product>(`products/${id}`, body);
  }

  remove(id: number): Observable<Product | null> {
    return this.api.delete<Product | null>(`products/${id}`);
  }

  addVariant(productId: number, body: VariantForm): Observable<Variant> {
    return this.api.post<Variant>(`products/${productId}/variants`, body);
  }

  updateVariant(id: number, body: Partial<VariantForm>): Observable<Variant> {
    return this.api.put<Variant>(`variants/${id}`, body);
  }
}
