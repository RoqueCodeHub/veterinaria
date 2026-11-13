import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout';
import { HomeComponent } from './features/public/home/home';
import { authGuard, permissionGuard, portalGuard } from './core/auth/auth-guard';

const allow = (permissions: string[]) => ({ canActivate: [permissionGuard], data: { permissions } });

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: HomeComponent, title: 'Inicio - Ali-vet' },
      { path: 'quienes-somos', loadComponent: () => import('./features/public/quienes-somos/quienes-somos').then(m => m.QuienesSomos), title: 'Quienes Somos - Ali-vet' },
      { path: 'especialidades', loadComponent: () => import('./features/public/especialidades/especialidades').then(m => m.Especialidades), title: 'Especialidades - Ali-vet' },
      { path: 'servicios', loadComponent: () => import('./features/public/servicios/servicios').then(m => m.Servicios), title: 'Servicios - Ali-vet' },
      { path: 'galeria', loadComponent: () => import('./features/public/galeria/galeria').then(m => m.Galeria), title: 'Galeria - Ali-vet' },
      { path: 'contacto', loadComponent: () => import('./features/public/contacto/contacto-page').then(m => m.ContactoPage), title: 'Contacto - Ali-vet' },
    ],
  },
  { path: 'login', loadComponent: () => import('./features/auth/login/login').then(m => m.Login), title: 'Iniciar Sesión' },
  { path: 'recuperar-contrasena', loadComponent: () => import('./features/auth/login/login').then(m => m.Login), title: 'Recuperar contraseña' },
  {
    path: 'portal',
    loadComponent: () => import('./layouts/portal-layout/portal-layout').then(m => m.PortalLayoutComponent),
    children: [
      { path: 'login', loadComponent: () => import('./features/portal/portal-login').then(m => m.PortalLogin), title: 'Portal - Ali-vet' },
      {
        path: '',
        canActivate: [portalGuard],
        loadComponent: () => import('./features/portal/portal-home').then(m => m.PortalHome),
        title: 'Mi portal - Ali-vet',
      },
    ],
  },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/admin/dashboard/dashboard').then(m => m.Dashboard), title: 'Dashboard - Admin', ...allow(['reports.view', 'reports.view_all']) },
      { path: 'alertas', loadComponent: () => import('./features/admin/alertas/alertas').then(m => m.Alertas), title: 'Alertas - Admin', ...allow(['inventory.view']) },
      { path: 'recordatorios', loadComponent: () => import('./features/admin/recordatorios/recordatorios').then(m => m.Recordatorios), title: 'Recordatorios - Admin', ...allow(['reminders.view', 'clinic.view', 'inventory.view', 'reports.view_all', 'cash.close']) },
      { path: 'productos', loadComponent: () => import('./features/admin/productos/productos').then(m => m.Productos), title: 'Productos - Admin', ...allow(['products.view']) },
      { path: 'marcas', loadComponent: () => import('./features/admin/marcas/marcas').then(m => m.Marcas), title: 'Marcas - Admin', ...allow(['products.view']) },
      { path: 'stock', loadComponent: () => import('./features/admin/stock/stock').then(m => m.Stock), title: 'Stock - Admin', ...allow(['inventory.view']) },
      { path: 'conteos', loadComponent: () => import('./features/admin/conteos/conteos').then(m => m.Conteos), title: 'Conteos - Admin', ...allow(['inventory.count', 'inventory.view']) },
      { path: 'importacion', loadComponent: () => import('./features/admin/importacion/importacion').then(m => m.Importacion), title: 'Importación - Admin', ...allow(['inventory.adjust']) },
      { path: 'pos', loadComponent: () => import('./features/admin/pos/nueva-venta').then(m => m.NuevaVentaComponent), title: 'Nueva Venta - Admin', ...allow(['sales.create']) },
      { path: 'ventas/nueva', redirectTo: '/admin/pos', pathMatch: 'full' },
      { path: 'ventas', redirectTo: '/admin/ventas-historial', pathMatch: 'full' },
      { path: 'ventas-historial', loadComponent: () => import('./features/admin/ventas-historial/ventas-historial').then(m => m.VentasHistorialComponent), title: 'Historial de ventas - Admin', ...allow(['sales.view', 'sales.create']) },
      { path: 'caja', loadComponent: () => import('./features/admin/caja/caja').then(m => m.Caja), title: 'Caja y Cobranza - Admin', ...allow(['cash.open', 'cash.close', 'sales.charge']) },
      { path: 'facturas', loadComponent: () => import('./features/admin/facturas/facturas').then(m => m.Facturas), title: 'Facturas - Admin', ...allow(['invoicing.view']) },
      { path: 'proveedores', loadComponent: () => import('./features/admin/proveedores/proveedores').then(m => m.Proveedores), title: 'Proveedores - Admin', ...allow(['purchases.view']) },
      { path: 'compras', loadComponent: () => import('./features/admin/compras/compras').then(m => m.Compras), title: 'Compras - Admin', ...allow(['purchases.view']) },
      { path: 'por-pagar', loadComponent: () => import('./features/admin/por-pagar/por-pagar').then(m => m.PorPagar), title: 'Por pagar - Admin', ...allow(['purchases.view']) },
      { path: 'categorias', loadComponent: () => import('./features/admin/categorias/categorias').then(m => m.Categorias), title: 'Categorías - Admin', ...allow(['products.view']) },
      { path: 'clientes', loadComponent: () => import('./features/admin/clientes/clientes').then(m => m.Clientes), title: 'Clientes - Admin', ...allow(['customers.view', 'sales.create']) },
      { path: 'mascotas', loadComponent: () => import('./features/admin/mascotas/mascotas').then(m => m.Mascotas), title: 'Mascotas - Admin', ...allow(['customers.view', 'sales.create']) },
      { path: 'servicios', loadComponent: () => import('./features/admin/servicios-clinica/servicios-clinica').then(m => m.ServiciosClinica), title: 'Servicios clínicos - Admin', ...allow(['clinic.view']) },
      { path: 'citas', loadComponent: () => import('./features/admin/citas/citas').then(m => m.Citas), title: 'Citas - Admin', ...allow(['clinic.view']) },
      { path: 'historia', loadComponent: () => import('./features/admin/historia/historia').then(m => m.Historia), title: 'Historia clínica - Admin', ...allow(['clinic.view']) },
      { path: 'usuarios', loadComponent: () => import('./features/admin/usuarios/usuarios').then(m => m.Usuarios), title: 'Usuarios - Admin', ...allow(['users.view']) },
      { path: 'auditoria', loadComponent: () => import('./features/admin/auditoria/auditoria').then(m => m.Auditoria), title: 'Auditoría - Admin', ...allow(['audit.view']) },
      { path: 'reportes', loadComponent: () => import('./features/admin/reportes/reportes').then(m => m.Reportes), title: 'Reportes - Admin', ...allow(['reports.view', 'reports.view_all']) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
