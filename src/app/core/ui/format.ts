export function fechaCorta(value: string | null | undefined): string {
  if (!value) return '—';
  const day = value.slice(0, 10);
  const parts = day.split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function soles(value: string | number | null | undefined): string {
  const amount = Number(value ?? 0);
  return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function whatsapp(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (!digits) return null;
  const full = digits.length === 9 ? `51${digits}` : digits;
  return `https://wa.me/${full}`;
}

export function clearError(errors: Record<string, string>, key: string): Record<string, string> {
  if (!errors[key]) return errors;
  const next = { ...errors };
  delete next[key];
  return next;
}
