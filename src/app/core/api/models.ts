export interface NamedRef {
  id: number;
  nombre?: string;
  name?: string;
}

export interface Category {
  id: number;
  nombre: string;
  descripcion: string | null;
  parent_id: number | null;
  parent?: { id: number; nombre: string } | null;
  activo: boolean;
}

export interface CategoryForm {
  nombre: string;
  descripcion?: string | null;
  parent_id?: number | null;
  activo?: boolean;
}

export interface Brand {
  id: number;
  nombre: string;
  activo: boolean;
}

export interface Variant {
  id: number;
  producto_id: number;
  sku: string | null;
  barcode: string | null;
  presentation: string | null;
  unit: string | null;
  sale_unit: string | null;
  units_per_box: number | null;
  cost_price: string | number | null;
  sale_price: string | number | null;
  on_hand?: number;
  min_stock: number | null;
  needs_review: boolean;
  review_note: string | null;
  activo: boolean;
  producto?: { id: number; nombre: string } | null;
  batches?: Batch[];
}

export interface Batch {
  id: number;
  batch_code: string | null;
  expiry_date: string | null;
  quantity: number;
  cost?: string | number | null;
}

export interface Product {
  id: number;
  nombre: string;
  descripcion: string | null;
  codigo: string | null;
  categoria_id: number | null;
  categoria?: { id: number; nombre: string } | null;
  marca_id: number | null;
  marca?: { id: number; nombre: string } | null;
  proveedor_id: number | null;
  proveedor?: { id: number; nombre: string } | null;
  presentacion: string | null;
  talla: string | null;
  variant_count: number;
  especie: string | null;
  tipo: string | null;
  precio_compra: string | number | null;
  precio_venta: string | number | null;
  stock_actual: number;
  stock_status: string;
  stock_minimo: string | number | null;
  unidad_medida: string | null;
  fecha_vencimiento: string | null;
  requiere_receta: boolean;
  requires_batch: boolean;
  activo: boolean;
  variantes?: Variant[];
}

export interface ProductForm {
  nombre: string;
  descripcion?: string | null;
  codigo?: string | null;
  categoria_id: number | null;
  marca_id: number | null;
  proveedor_id: number | null;
  presentacion?: string | null;
  talla?: string | null;
  especie?: string | null;
  tipo?: string | null;
  precio_compra?: number | null;
  precio_venta?: number | null;
  stock_minimo?: number | null;
  unidad_medida?: string | null;
  fecha_vencimiento?: string | null;
  requiere_receta?: boolean;
  requires_batch?: boolean;
  activo?: boolean;
  apply_to_group?: boolean;
}

export interface VariantForm {
  sku?: string | null;
  barcode?: string | null;
  presentation?: string | null;
  unit?: string | null;
  sale_unit?: string | null;
  units_per_box?: number | null;
  cost_price?: number | null;
  sale_price?: number | null;
  min_stock?: number | null;
  needs_review?: boolean;
  review_note?: string | null;
  activo?: boolean;
}

export interface Customer {
  id: number;
  name: string;
  document_type: string | null;
  document_number: string | null;
  phone: string | null;
  notes: string | null;
  activo: boolean;
  portal_enabled: boolean;
}

export interface CustomerForm {
  name: string;
  document_type?: string | null;
  document_number?: string | null;
  phone?: string | null;
  notes?: string | null;
  activo?: boolean;
}

export interface Pet {
  id: number;
  cliente_id: number;
  nombre: string;
  especie: string | null;
  raza: string | null;
  sexo: string | null;
  fecha_nacimiento: string | null;
  peso: string | number | null;
  alergias: string | null;
  foto_url: string | null;
  cliente?: { id: number; name: string };
}

export interface PetForm {
  cliente_id?: number | null;
  nombre: string;
  especie?: string | null;
  raza?: string | null;
  sexo?: string | null;
  fecha_nacimiento?: string | null;
  peso?: number | null;
  alergias?: string | null;
}

export interface Supplier {
  id: number;
  name: string;
  ruc: string | null;
  phone: string | null;
  email: string | null;
  activo: boolean;
}

export interface SupplierForm {
  name: string;
  ruc?: string | null;
  phone?: string | null;
  email?: string | null;
  activo?: boolean;
}

export interface StockRow {
  variant: Variant;
  on_hand: number;
  min_stock: number;
  low_stock: boolean;
}

export interface CatalogItem {
  id: number;
  variant_id: number;
  nombre: string;
  codigo: string | null;
  presentacion: string | null;
  categoria: string | null;
  categoria_id: number | null;
  sku: string | null;
  sale_price: number;
  on_hand: number;
}

export interface SaleItem {
  id: number;
  item_type: string;
  variant_id: number | null;
  description: string;
  quantity: number;
  unit_price: string | number;
  discount: string | number;
  line_total: string | number;
}

export interface SalePayment {
  method: string;
  amount: string | number;
}

export interface Sale {
  id: number;
  document: string;
  series: string;
  number: number;
  customer_id: number | null;
  pet_id: number | null;
  cliente: string | null;
  mascota: string | null;
  cajero: string | null;
  subtotal: string | number;
  discount: string | number;
  total: string | number;
  paid: string | number;
  balance: string | number;
  change_amount: string | number | null;
  status: string;
  payment_status: string;
  created_at: string | null;
  items?: SaleItem[];
  payments?: SalePayment[];
  invoices?: { id: number; document: string; document_type: string; status: string; total: string | number }[];
}

export interface Receipt {
  document: string;
  fecha: string | null;
  cajero: string | null;
  cliente: string | null;
  mascota: string | null;
  status: string;
  items: { description: string; quantity: number; unit_price: string | number; line_total: string | number }[];
  subtotal: string | number;
  discount: string | number;
  total: string | number;
  paid: string | number;
  balance: string | number;
  payments: SalePayment[];
  change_amount: string | number | null;
}

export interface CashSession {
  id: number;
  cajero?: string;
  opened_at: string | null;
  closed_at: string | null;
  opening_amount: string | number;
  expected_amount: string | number | null;
  counted_amount: string | number | null;
  difference: string | number | null;
  open: boolean;
}

export interface PurchaseItem {
  id?: number;
  variant_id: number;
  sku?: string | null;
  producto?: string | null;
  presentation?: string | null;
  batch_code?: string | null;
  expiry_date?: string | null;
  quantity: number;
  cost: string | number;
  line_total?: string | number;
}

export interface Purchase {
  id: number;
  supplier_id: number;
  supplier?: { id: number; name: string; ruc: string | null };
  comprobante: string | null;
  fecha: string | null;
  due_date: string | null;
  total: string | number;
  paid_amount: string | number;
  balance: string | number;
  status: string;
  payment_status: string;
  notes: string | null;
  items?: PurchaseItem[];
  payments?: { id: number; amount: string | number; method: string | null; reference: string | null; paid_at: string | null }[];
}

export interface Invoice {
  id: number;
  document: string;
  document_type: string;
  series: string;
  number: number;
  sale_id: number;
  total: string | number;
  igv: string | number;
  status: string;
  customer_name: string | null;
  customer_doc_number: string | null;
  pse_message: string | null;
  created_at: string | null;
}

export interface VetService {
  id: number;
  code: string;
  name: string;
  duration_minutes: number | null;
  sale_price: string | number;
  staff_role: string | null;
  activo: boolean;
}

export interface Appointment {
  id: number;
  cliente_id: number | null;
  pet_id: number;
  mascota?: string | null;
  cliente?: string | null;
  clinic_service_id: number;
  servicio?: string | null;
  sale_price?: string | number | null;
  staff_user_id: number;
  staff?: string | null;
  scheduled_at: string | null;
  status: string;
  notes: string | null;
  sale_id: number | null;
}

export interface MedicalRecord {
  id: number;
  pet_id: number;
  type: string | null;
  diagnostico: string | null;
  tratamiento: string | null;
  peso: string | number | null;
  examenes: string | null;
  notes: string | null;
  created_at: string | null;
  veterinario?: string | null;
  attachments?: { id: number; kind: string; original_name: string | null }[];
}

export interface Vaccination {
  id: number;
  pet_id: number;
  vaccine_name: string;
  applied_at: string | null;
  next_due_at: string | null;
}

export interface Deworming {
  id: number;
  pet_id: number;
  product_name: string;
  applied_at: string | null;
  next_due_at: string | null;
}

export interface Reminder {
  id: number;
  type: string;
  audience: string;
  title: string;
  message: string | null;
  due_at: string | null;
  status: string;
  cliente?: string | null;
  whatsapp_url?: string | null;
}

export interface StaffAccount {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  roles: string[];
  permissions: string[];
}

export interface AuditLog {
  id: number;
  user: string | null;
  action: string;
  model: string;
  model_id: number | null;
  ip: string | null;
  created_at: string | null;
}

export interface LoginLog {
  id: number;
  email: string;
  success: boolean;
  user: string | null;
  ip: string | null;
  created_at: string | null;
}

export interface ExpiryAlerts {
  vencido: ExpiryRow[];
  vence_30: ExpiryRow[];
  vence_60: ExpiryRow[];
  vence_90: ExpiryRow[];
}

export interface ExpiryRow {
  batch_id: number;
  batch_code: string | null;
  expiry_date: string | null;
  quantity: number;
  sku: string | null;
  producto: string | null;
  presentation: string | null;
}

export interface LowStockRow {
  variant_id: number;
  sku: string | null;
  producto: string | null;
  presentation: string | null;
  on_hand: number;
  min_stock: number;
}

export interface StockCount {
  id: number;
  status: string;
  notes: string | null;
  counted_at: string | null;
  approved_at: string | null;
  user?: { id: number; name: string };
  items?: {
    id: number;
    variant_id: number;
    sku: string | null;
    producto: string | null;
    presentation: string | null;
    system_qty: number;
    counted_qty: number | null;
    difference: number;
  }[];
}

export interface KardexLine {
  id: number;
  fecha: string | null;
  usuario: string | null;
  movimiento: string;
  cantidad: number;
  saldo: number;
  motivo: string | null;
  lote: string | null;
}

export interface DashboardComparison {
  previous: number;
  diff: number;
  percent: number;
}

export interface DashboardProductSummary {
  variant_id: number;
  description?: string;
  quantity?: number;
  total?: number;
}

export interface DashboardCategorySummary {
  categoria?: string;
  quantity?: number;
  total: number;
}

export interface DashboardCashierSummary {
  user_id: number;
  cajero?: string;
  sales_count?: number;
  total?: number;
}

export interface DashboardPaymentSummary {
  method: string;
  total: number;
}

export interface DashboardHourSummary {
  hour: number;
  sales_count?: number;
  total?: number;
}

export interface DashboardSlowMover {
  variant_id: number;
  sku?: string;
  producto?: string;
  on_hand?: number;
}

export interface DashboardExpiringBatch {
  batch_id: number;
  batch_code?: string;
  expiry_date?: string;
  quantity?: number;
  variant_id?: number;
  sku?: string;
  producto?: string;
  presentation?: string;
}

export interface DashboardExpiringSummary {
  vencido?: DashboardExpiringBatch[];
  vence_30?: DashboardExpiringBatch[];
  vence_60?: DashboardExpiringBatch[];
  vence_90?: DashboardExpiringBatch[];
}

export interface DashboardReport {
  role: string;
  today: { count: number; total: number };
  week?: { count: number; total: number };
  month?: { count: number; total: number };
  comparison?: { today?: DashboardComparison; week?: DashboardComparison; month?: DashboardComparison };
  sales_by_day?: { date: string; sales_count: number; total: number; profit?: number; items_sold?: number }[];
  products_by_day?: { date: string; quantity: number; total: number }[];
  by_payment?: DashboardPaymentSummary[];
  top_products?: DashboardProductSummary[];
  by_category?: DashboardCategorySummary[];
  by_cashier?: DashboardCashierSummary[];
  by_hour?: DashboardHourSummary[];
  profit?: { sales_total?: number; cost?: number; refund_total?: number; profit?: number; sales_count?: number };
  inventory_value?: { units?: number; value?: number };
  slow_movers?: DashboardSlowMover[];
  expiring?: DashboardExpiringSummary;
  cash?: CashSession | null;
  board?: { active_products: number; customers: number; low_stock: number };
  week_days?: { date: string; total: number; completed: number; pending: number; voided: number }[];
}

export interface PortalProfile {
  user: StaffAccount;
  customer: Customer;
}
