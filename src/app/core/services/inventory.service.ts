import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from '../api/api-client';
import { Page, PageQuery } from '../api/envelope';
import { ExpiryAlerts, KardexLine, LowStockRow, StockCount, StockRow, Variant } from '../api/models';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly api = inject(ApiClient);

  stock(query: PageQuery): Observable<Page<StockRow>> {
    return this.api.getPage<StockRow>('stock', query);
  }

  show(variantId: number): Observable<{ variant: Variant; on_hand: number; batches: { id: number; batch_code: string | null; expiry_date: string | null; quantity: number; estado: string }[]; fefo: { id: number; batch_code: string | null; expiry_date: string | null; quantity: number }[] }> {
    return this.api.getData(`stock/${variantId}`);
  }

  kardex(variantId: number): Observable<KardexLine[]> {
    return this.api.getData<KardexLine[]>(`variants/${variantId}/kardex`);
  }

  exportStock(): Observable<Blob> {
    return this.api.blob('stock/export');
  }

  exportKardex(variantId: number): Observable<Blob> {
    return this.api.blob(`variants/${variantId}/kardex/export`);
  }

  receive(body: { producto_id: number; variant_id?: number | null; batch_code?: string | null; quantity: number; cost?: number | null; sale_price?: number | null; expiry_date?: string | null; reason?: string | null }): Observable<unknown> {
    return this.api.post('stock/receipts', body);
  }

  adjust(body: { batch_id: number; direction: 'entrada' | 'salida'; quantity: number; reason: string; type?: string }): Observable<unknown> {
    return this.api.post('stock/adjustments', body);
  }

  openBox(body: { batch_id: number; boxes: number }): Observable<unknown> {
    return this.api.post('stock/open-box', body);
  }

  counts(query: PageQuery): Observable<Page<StockCount>> {
    return this.api.getPage<StockCount>('stock/counts', query);
  }

  createCount(notes?: string): Observable<StockCount> {
    return this.api.post<StockCount>('stock/counts', { notes });
  }

  showCount(id: number): Observable<StockCount> {
    return this.api.getData<StockCount>(`stock/counts/${id}`);
  }

  recordCount(id: number, items: { id: number; counted_qty: number }[]): Observable<StockCount> {
    return this.api.put<StockCount>(`stock/counts/${id}/lines`, { items });
  }

  approveCount(id: number): Observable<StockCount> {
    return this.api.post<StockCount>(`stock/counts/${id}/approve`, {});
  }

  expiring(): Observable<ExpiryAlerts> {
    return this.api.getData<ExpiryAlerts>('alerts/expiring');
  }

  lowStock(): Observable<LowStockRow[]> {
    return this.api.getData<LowStockRow[]>('alerts/low-stock');
  }

  template(): Observable<Blob> {
    return this.api.blob('import/inventory/template');
  }

  importFile(file: File): Observable<unknown> {
    const form = new FormData();
    form.append('file', file);
    return this.api.postForm('import/inventory', form);
  }

  pending(query: PageQuery = { page: 1, perPage: 20 }): Observable<Page<Variant>> {
    return this.api.getPage<Variant>('inventory/pending-review', query);
  }

  resolvePending(id: number, body: Partial<Variant>): Observable<Variant> {
    return this.api.put<Variant>(`inventory/pending-review/${id}`, body);
  }
}
