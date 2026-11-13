export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]>;
}

export interface PageMeta {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface Page<T> {
  items: T[];
  meta: PageMeta;
  summary?: Record<string, number>;
}

export interface PageQuery {
  page?: number;
  perPage?: number;
  q?: string;
  extra?: Record<string, string | number | boolean | null | undefined>;
}
