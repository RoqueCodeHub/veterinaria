export interface NavLink {
  label: string;
  path: string;
  icon: string;
  exact?: boolean;
  permissions: string[];
}

export interface NavSection {
  label: string;
  links: NavLink[];
}

export const ADMIN_NAV: NavSection[] = [
  {
    label: 'General',
    links: [
      { label: 'Dashboard', path: '/admin/dashboard', exact: true, icon: 'pi pi-home', permissions: ['reports.view', 'reports.view_all'] },
      { label: 'Alertas', path: '/admin/alertas', icon: 'pi pi-exclamation-triangle', permissions: ['inventory.view'] },
      { label: 'Recordatorios', path: '/admin/recordatorios', icon: 'pi pi-bell', permissions: ['reminders.view', 'clinic.view', 'inventory.view', 'reports.view_all', 'cash.close'] },
    ],
  },
  {
    label: 'Catálogo',
    links: [
      { label: 'Productos', path: '/admin/productos', icon: 'pi pi-box', permissions: ['products.view'] },
      { label: 'Marcas', path: '/admin/marcas', icon: 'pi pi-bookmark', permissions: ['products.view'] },
      { label: 'Categorías', path: '/admin/categorias', icon: 'pi pi-tags', permissions: ['products.view'] },
      { label: 'Stock', path: '/admin/stock', icon: 'pi pi-list', permissions: ['inventory.view'] },
      { label: 'Conteos', path: '/admin/conteos', icon: 'pi pi-check-square', permissions: ['inventory.count', 'inventory.view'] },
      { label: 'Importación', path: '/admin/importacion', icon: 'pi pi-upload', permissions: ['inventory.adjust'] },
    ],
  },
  {
    label: 'Compras',
    links: [
      { label: 'Proveedores', path: '/admin/proveedores', icon: 'pi pi-truck', permissions: ['purchases.view'] },
      { label: 'Compras', path: '/admin/compras', icon: 'pi pi-shopping-bag', permissions: ['purchases.view'] },
      { label: 'Por pagar', path: '/admin/por-pagar', icon: 'pi pi-money-bill', permissions: ['purchases.view'] },
    ],
  },
  {
    label: 'Atención',
    links: [
      { label: 'Clientes', path: '/admin/clientes', icon: 'pi pi-users', permissions: ['customers.view', 'sales.create'] },
      { label: 'Mascotas', path: '/admin/mascotas', icon: 'pi pi-heart', permissions: ['customers.view', 'sales.create'] },
      { label: 'Nueva venta', path: '/admin/pos', icon: 'pi pi-shopping-cart', permissions: ['sales.create'] },
      { label: 'Historial', path: '/admin/ventas-historial', icon: 'pi pi-history', permissions: ['sales.view', 'sales.create'] },
      { label: 'Caja', path: '/admin/caja', icon: 'pi pi-wallet', permissions: ['cash.open', 'cash.close', 'sales.charge'] },
      { label: 'Facturas', path: '/admin/facturas', icon: 'pi pi-file', permissions: ['invoicing.view'] },
    ],
  },
  {
    label: 'Clínica',
    links: [
      { label: 'Servicios', path: '/admin/servicios', icon: 'pi pi-briefcase', permissions: ['clinic.view'] },
      { label: 'Citas', path: '/admin/citas', icon: 'pi pi-calendar', permissions: ['clinic.view'] },
      { label: 'Historia', path: '/admin/historia', icon: 'pi pi-book', permissions: ['clinic.view'] },
    ],
  },
  {
    label: 'Análisis',
    links: [
      { label: 'Reportes', path: '/admin/reportes', icon: 'pi pi-chart-bar', permissions: ['reports.view', 'reports.view_all'] },
    ],
  },
  {
    label: 'Sistema',
    links: [
      { label: 'Usuarios', path: '/admin/usuarios', icon: 'pi pi-id-card', permissions: ['users.view'] },
      { label: 'Auditoría', path: '/admin/auditoria', icon: 'pi pi-shield', permissions: ['audit.view'] },
    ],
  },
];

export function firstAllowedPath(can: (...permissions: string[]) => boolean): string | null {
  for (const section of ADMIN_NAV) {
    for (const link of section.links) {
      if (can(...link.permissions)) return link.path;
    }
  }
  return null;
}
