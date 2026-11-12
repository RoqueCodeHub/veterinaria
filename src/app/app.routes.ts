// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './layouts/public-layout/public-layout';
import { AdminLayoutComponent } from './layouts/admin-layout/admin-layout';
import { HomeComponent } from './features/public/home/home';
import { authGuard } from './core/auth/auth-guard';

export const routes: Routes = [
    // Layout público (landing, páginas de contenido)
    {
        path: '',
        component: PublicLayoutComponent,
        children: [
            {
                path: '',
                component: HomeComponent,
                title: 'Inicio - Ali-vet'
            },
            {
                path: 'quienes-somos',
                loadComponent: () => import('./features/public/quienes-somos/quienes-somos').then(m => m.QuienesSomos),
                title: 'Quienes Somos - Ali-vet'
            },
            {
                path: 'especialidades',
                loadComponent: () => import('./features/public/especialidades/especialidades').then(m => m.Especialidades),
                title: 'Especialidades - Ali-vet'
            },
            {
                path: 'servicios',
                loadComponent: () => import('./features/public/servicios/servicios').then(m => m.Servicios),
                title: 'Servicios - Ali-vet'
            },
            {
                path: 'galeria',
                loadComponent: () => import('./features/public/galeria/galeria').then(m => m.Galeria),
                title: 'Galeria - Ali-vet'
            },
            {
                path: 'contacto',
                loadComponent: () => import('./features/public/contacto/contacto-page').then(m => m.ContactoPage),
                title: 'Contacto - Ali-vet'
            },
        ]
    },

    // Login independiente (pantalla completa, sin header)
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
        title: 'Iniciar Sesión'
    },
    {
        path: 'recuperar-contrasena',
        loadComponent: () => import('./features/auth/login/login').then(m => m.Login),
        title: 'Recuperar contraseña'
    },

    // Área de administración (protegida con sidebar compartido)
    {
        path: 'admin',
        component: AdminLayoutComponent,
        canActivate: [authGuard],
        canActivateChild: [authGuard],
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./features/admin/dashboard/dashboard').then(m => m.Dashboard),
                title: 'Dashboard - Admin'
            },
            {
                path: 'productos',
                loadComponent: () => import('./features/admin/productos/productos').then(m => m.Productos),
                title: 'Productos - Admin'
            },
            {
                path: 'stock',
                loadComponent: () => import('./features/admin/stock/stock').then(m => m.Stock),
                title: 'Stock - Admin'
            },
            {
                path: 'pos',
                loadComponent: () => import('./features/admin/pos/nueva-venta').then(m => m.NuevaVentaComponent),
                title: 'Nueva Venta - Admin'
            },
            {
                path: 'ventas/nueva',
                redirectTo: '/admin/pos',
                pathMatch: 'full'
            },
            {
                path: 'ventas',
                loadComponent: () => import('./features/admin/ventas/ventas').then(m => m.Ventas),
                title: 'Ventas - Admin'
            },
            {
                path: 'ventas-historial',
                loadComponent: () => import('./features/admin/ventas-historial/ventas-historial').then(m => m.VentasHistorialComponent),
                title: 'Historial de ventas - Admin'
            },
            {
                path: 'caja',
                loadComponent: () => import('./features/admin/caja/caja').then(m => m.Caja),
                title: 'Caja y Cobranza - Admin'
            },
            {
                path: 'proveedores',
                loadComponent: () => import('./features/admin/proveedores/proveedores').then(m => m.Proveedores),
                title: 'Proveedores - Admin'
            },
            {
                path: 'categorias',
                loadComponent: () => import('./features/admin/categorias/categorias').then(m => m.Categorias),
                title: 'Categorías - Admin'
            },
            {
                path: 'clientes',
                loadComponent: () => import('./features/admin/clientes/clientes').then(m => m.Clientes),
                title: 'Clientes - Admin'
            },
            {
                path: 'reportes',
                loadComponent: () => import('./features/admin/reportes/reportes').then(m => m.Reportes),
                title: 'Reportes - Admin'
            },
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            }
        ]
    },

    // Ruta comodín
    {
        path: '**',
        redirectTo: ''
    }
];
