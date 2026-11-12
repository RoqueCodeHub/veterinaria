import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Router } from '@angular/router';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { Toast } from 'primeng/toast';
import { AuthService, User } from '../../core/auth/auth';

interface NavLink {
    label: string;
    path: string;
    exact?: boolean;
    icon: string;
}

interface NavSection {
    label: string;
    links: NavLink[];
}

@Component({
    selector: 'app-admin-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, Avatar, Button, Drawer, Toast],
    templateUrl: './admin-layout.html',
})
export class AdminLayoutComponent implements OnInit {
    user: User | null = null;
    menuOpen = false;
    private authService = inject(AuthService);
    private router = inject(Router);
    private readonly sections: NavSection[] = [
        {
            label: 'General',
            links: [
                { label: 'Dashboard', path: '/admin/dashboard', exact: true, icon: 'pi pi-home' },
            ],
        },
        {
            label: 'Catálogo',
            links: [
                { label: 'Productos', path: '/admin/productos', icon: 'pi pi-box' },
                { label: 'Stock', path: '/admin/stock', icon: 'pi pi-list' },
                { label: 'Categorías', path: '/admin/categorias', icon: 'pi pi-tags' },
                { label: 'Proveedores', path: '/admin/proveedores', icon: 'pi pi-truck' },
            ],
        },
        {
            label: 'Atención',
            links: [
                { label: 'Clientes', path: '/admin/clientes', icon: 'pi pi-users' },
                { label: 'Nueva venta', path: '/admin/pos', icon: 'pi pi-shopping-cart' },
                { label: 'Historial', path: '/admin/ventas-historial', icon: 'pi pi-history' },
                { label: 'Caja', path: '/admin/caja', icon: 'pi pi-wallet' },
            ],
        },
        {
            label: 'Análisis',
            links: [
                { label: 'Reportes', path: '/admin/reportes', icon: 'pi pi-chart-bar' },
            ],
        },
    ];
    puedeCobrar = true;

    get menu(): NavSection[] {
        return this.sections
            .map((section) => ({
                ...section,
                links: section.links.filter((link) => link.path !== '/admin/caja' || this.puedeCobrar),
            }))
            .filter((section) => section.links.length > 0);
    }

    ngOnInit(): void {
        this.user = this.authService.getUser();
        this.puedeCobrar = this.user?.puede_cobrar !== false;
        this.authService.refreshProfile().subscribe({
            next: (user) => {
                this.user = user;
                this.puedeCobrar = user?.puede_cobrar !== false;
            },
        });
    }

    toggleMenu(): void {
        this.menuOpen = !this.menuOpen;
    }

    closeMenu(): void {
        this.menuOpen = false;
    }

    logout(): void {
        this.authService.logout().subscribe({
            next: () => this.router.navigate(['']),
            error: () => this.router.navigate([''])
        });
    }
}
