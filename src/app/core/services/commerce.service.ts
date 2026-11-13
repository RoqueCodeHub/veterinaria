import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api/api-client';
import { Page, PageQuery } from '../api/envelope';
import { CashSession, CatalogItem, Invoice, Purchase, Receipt, Sale } from '../api/models';

export interface StoreSaleBody {
  idempotency_key: string;
  customer_id?: number | null;
  pet_id?: number | null;
  discount?: number;
  notes?: string | null;
  invoice_type?: 'boleta' | 'factura';
  pending?: boolean;
  items: {
    item_type?: 'product' | 'service';
    variant_id?: number;
    description?: string;
    quantity: number;
    unit_price?: number;
    discount?: number;
  }[];
  payments?: { method: string; amount: number }[];
}

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly api = inject(ApiClient);

  search(query: PageQuery): Observable<Page<CatalogItem>> {
    return this.api.getPage<CatalogItem>('pos/search', query);
  }

  list(query: PageQuery): Observable<Page<Sale>> {
    return this.api.getPage<Sale>('sales', query);
  }

  show(id: number): Observable<Sale> {
    return this.api.getData<Sale>(`sales/${id}`);
  }

  create(body: StoreSaleBody): Observable<Sale> {
    return this.api.post<Sale>('sales', body);
  }

  pay(id: number, payments: { method: string; amount: number }[], invoiceType?: 'boleta' | 'factura'): Observable<Sale> {
    return this.api.post<Sale>(`sales/${id}/pay`, { payments, invoice_type: invoiceType });
  }

  receipt(id: number): Observable<Receipt> {
    return this.api.getData<Receipt>(`sales/${id}/receipt`);
  }

  ticket(id: number): Observable<Blob> {
    return this.api.blob(`sales/${id}/ticket`);
  }

  void(id: number, reason: string): Observable<Sale> {
    return this.api.post<Sale>(`sales/${id}/void`, { reason });
  }

  returnSale(id: number, body: { reason: string; refund_method?: string; items: { sale_item_id: number; quantity: number }[] }): Observable<{ id: number; refund_total: string | number }> {
    return this.api.post(`sales/${id}/returns`, body);
  }
}

@Injectable({ providedIn: 'root' })
export class CashService {
  private readonly api = inject(ApiClient);

  current(): Observable<CashSession | null> {
    return this.api.getData<CashSession | null>('cash-sessions/current');
  }

  open(openingAmount: number): Observable<CashSession> {
    return this.api.post<CashSession>('cash-sessions/open', { opening_amount: openingAmount });
  }

  close(id: number, countedAmount: number, notes?: string): Observable<CashSession> {
    return this.api.post<CashSession>(`cash-sessions/${id}/close`, { counted_amount: countedAmount, notes });
  }
}

@Injectable({ providedIn: 'root' })
export class PurchasesService {
  private readonly api = inject(ApiClient);

  list(query: PageQuery): Observable<Page<Purchase>> {
    return this.api.getPage<Purchase>('purchases', query);
  }

  payables(query: PageQuery): Observable<Page<Purchase>> {
    return this.api.getPage<Purchase>('purchases/payables', query);
  }

  show(id: number): Observable<Purchase> {
    return this.api.getData<Purchase>(`purchases/${id}`);
  }

  create(body: { supplier_id: number; comprobante?: string | null; fecha: string; due_date?: string | null; notes?: string | null; items: { variant_id: number; batch_code: string; expiry_date?: string | null; quantity: number; cost: number }[] }): Observable<Purchase> {
    return this.api.post<Purchase>('purchases', body);
  }

  update(id: number, body: Partial<{ comprobante: string | null; fecha: string; due_date: string | null; notes: string | null }>): Observable<Purchase> {
    return this.api.put<Purchase>(`purchases/${id}`, body);
  }

  confirm(id: number): Observable<Purchase> {
    return this.api.post<Purchase>(`purchases/${id}/confirm`, {});
  }

  pay(id: number, body: { amount: number; method?: string; reference?: string; paid_at?: string }): Observable<Purchase> {
    return this.api.post<Purchase>(`purchases/${id}/payments`, body);
  }

  costHistory(variantId: number): Observable<{ id: number; cost: string | number; purchase_id: number; comprobante: string | null; created_at: string | null }[]> {
    return this.api.getData(`variants/${variantId}/cost-history`);
  }
}

@Injectable({ providedIn: 'root' })
export class InvoicesService {
  private readonly api = inject(ApiClient);

  list(query: PageQuery): Observable<Page<Invoice>> {
    return this.api.getPage<Invoice>('invoices', query);
  }

  show(id: number): Observable<Invoice> {
    return this.api.getData<Invoice>(`invoices/${id}`);
  }

  series(): Observable<{ id: number; document_type: string; series: string; next_number: number; active: boolean }[]> {
    return this.api.getData('invoices/series');
  }

  requirements(): Observable<Record<string, unknown>> {
    return this.api.getData('invoices/requirements');
  }

  emit(saleId: number, body: { type: 'boleta' | 'factura'; customer_doc_type?: string; customer_doc_number?: string; customer_name?: string; customer_address?: string }): Observable<Invoice> {
    return this.api.post<Invoice>(`sales/${saleId}/invoices`, body);
  }

  retry(id: number): Observable<Invoice> {
    return this.api.post<Invoice>(`invoices/${id}/retry`, {});
  }
}
