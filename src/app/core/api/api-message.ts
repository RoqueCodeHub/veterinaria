import { HttpErrorResponse } from '@angular/common/http';

export function apiMessage(error: HttpErrorResponse, fallback: string): string {
  const body = error.error;
  if (body && typeof body === 'object') {
    const errors = 'errors' in body ? body.errors : null;
    if (errors && typeof errors === 'object') {
      const first = Object.values(errors as Record<string, unknown>)[0];
      if (Array.isArray(first) && typeof first[0] === 'string' && first[0].trim()) {
        return first[0];
      }
    }
    if ('message' in body && typeof body.message === 'string' && body.message.trim()) {
      if (/SQLSTATE|SQL:|Unknown column|Connection:/i.test(body.message)) return fallback;
      return body.message;
    }
  }
  if (error.status === 0) return 'No se puede conectar al servidor.';
  return fallback;
}

export function etiqueta(valor: string | null | undefined, mapa: Record<string, string>): string {
  if (!valor) return '—';
  return mapa[valor] ?? valor;
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
