import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api/api-client';
import { Page, PageQuery } from '../api/envelope';
import { Customer, CustomerForm, Pet, PetForm, Sale, Supplier, SupplierForm } from '../api/models';

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly api = inject(ApiClient);

  list(query: PageQuery): Observable<Page<Customer>> {
    return this.api.getPage<Customer>('customers', query);
  }

  show(id: number): Observable<Customer> {
    return this.api.getData<Customer>(`customers/${id}`);
  }

  create(body: CustomerForm): Observable<Customer> {
    return this.api.post<Customer>('customers', body);
  }

  update(id: number, body: Partial<CustomerForm>): Observable<Customer> {
    return this.api.put<Customer>(`customers/${id}`, body);
  }

  sales(id: number, query: PageQuery): Observable<Page<Sale>> {
    return this.api.getPage<Sale>(`customers/${id}/purchases`, query);
  }

  pets(id: number, query: PageQuery): Observable<Page<Pet>> {
    return this.api.getPage<Pet>(`customers/${id}/pets`, query);
  }

  addPet(id: number, body: PetForm): Observable<Pet> {
    return this.api.post<Pet>(`customers/${id}/pets`, body);
  }

  enablePortal(id: number, email: string, password: string): Observable<{ user_id: number; email: string }> {
    return this.api.post(`customers/${id}/portal`, { email, password });
  }
}

@Injectable({ providedIn: 'root' })
export class PetsService {
  private readonly api = inject(ApiClient);

  list(query: PageQuery): Observable<Page<Pet>> {
    return this.api.getPage<Pet>('pets', query);
  }

  show(id: number): Observable<Pet> {
    return this.api.getData<Pet>(`pets/${id}`);
  }

  create(body: PetForm): Observable<Pet> {
    return this.api.post<Pet>('pets', body);
  }

  update(id: number, body: Partial<PetForm>): Observable<Pet> {
    return this.api.put<Pet>(`pets/${id}`, body);
  }

  remove(id: number): Observable<null> {
    return this.api.delete<null>(`pets/${id}`);
  }

  uploadPhoto(id: number, file: File): Observable<Pet> {
    const form = new FormData();
    form.append('foto', file);
    return this.api.postForm<Pet>(`pets/${id}/photo`, form);
  }

  downloadPhoto(id: number): Observable<Blob> {
    return this.api.blob(`pets/${id}/photo`);
  }
}

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private readonly api = inject(ApiClient);

  list(query: PageQuery): Observable<Page<Supplier>> {
    return this.api.getPage<Supplier>('suppliers', query);
  }

  create(body: SupplierForm): Observable<Supplier> {
    return this.api.post<Supplier>('suppliers', body);
  }

  update(id: number, body: Partial<SupplierForm>): Observable<Supplier> {
    return this.api.put<Supplier>(`suppliers/${id}`, body);
  }
}
