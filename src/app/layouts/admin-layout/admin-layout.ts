import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Drawer } from 'primeng/drawer';
import { InputText } from 'primeng/inputtext';
import { Toast } from 'primeng/toast';
import { HttpErrorResponse } from '@angular/common/http';
import { ADMIN_NAV, NavLink, NavSection } from '../../core/auth/admin-nav';
import { AuthService, StaffUser } from '../../core/auth/auth';
import { apiMessage } from '../../core/api/api-message';
import { ClinicService } from '../../core/services/clinic-reports.service';
import { PurchasesService } from '../../core/services/commerce.service';
import { InventoryService } from '../../core/services/inventory.service';
import { NotifyService } from '../../core/ui/notify';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive, Avatar, Button, Dialog, Drawer, InputText, Toast],
  templateUrl: './admin-layout.html',
})
export class AdminLayoutComponent implements OnInit {
  user: StaffUser | null = null;
  menuOpen = false;
  navQuery = '';
  readonly sidebarCollapsed = signal(false);
  readonly favorites = signal<string[]>([]);
  readonly collapsedSections = signal<Record<string, boolean>>({});
  readonly userMenuOpen = signal(false);
  readonly profileOpen = signal(false);
  passwordOpen = signal(false);
  savingPassword = signal(false);
  passwordError = signal<string | null>(null);
  passwordForm = { current: '', next: '', confirm: '' };
  private authService = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotifyService);
  private inventory = inject(InventoryService);
  private clinic = inject(ClinicService);
  private purchases = inject(PurchasesService);
  readonly alertCount = signal(0);
  readonly payableCount = signal(0);
  readonly appointmentCount = signal(0);

  get menu(): NavSection[] {
    const query = this.normalizeSearch(this.navQuery);
    return ADMIN_NAV
      .map((section) => ({
        ...section,
        links: section.links.filter((link) =>
          this.authService.can(...link.permissions)
          && (!query || this.normalizeSearch(`${section.label} ${link.label}`).includes(query)),
        ),
      }))
      .filter((section) => section.links.length > 0);
  }

  get favoriteLinks(): NavLink[] {
    const favoritePaths = new Set(this.favorites());
    return this.menu.flatMap((section) => section.links).filter((link) => favoritePaths.has(link.path));
  }

  get favoritesSection(): NavSection {
    return { label: 'Fijados', links: this.favoriteLinks };
  }

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.restoreMenuPreferences();
    this.loadNavigationCounts();
    this.authService.refreshProfile().subscribe({
      next: (user) => {
        this.user = user;
      },
    });
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    this.userMenuOpen.set(false);
  }

  setMenuOpen(open: boolean): void {
    this.menuOpen = open;
    if (!open) this.userMenuOpen.set(false);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
    this.saveMenuPreferences();
  }

  isCompactMenu(): boolean {
    return this.sidebarCollapsed() && !this.menuOpen;
  }

  toggleSection(section: NavSection): void {
    if (this.navQuery || this.isSectionActive(section)) return;
    this.collapsedSections.update((state) => ({ ...state, [section.label]: !state[section.label] }));
    this.saveMenuPreferences();
  }

  isSectionOpen(section: NavSection): boolean {
    if (this.navQuery || this.isSectionActive(section)) return true;
    return !this.collapsedSections()[section.label];
  }

  isSectionActive(section: NavSection): boolean {
    const currentPath = this.router.url.split(/[?#]/, 1)[0] ?? '';
    return section.links.some((link) => currentPath === link.path || currentPath.startsWith(`${link.path}/`));
  }

  sectionCount(section: NavSection): number {
    return section.links.reduce((sum, link) => sum + this.linkCount(link), 0);
  }

  linkCount(link: NavLink): number {
    if (link.path === '/admin/alertas') return this.alertCount();
    if (link.path === '/admin/por-pagar') return this.payableCount();
    if (link.path === '/admin/citas') return this.appointmentCount();
    return 0;
  }

  countLabel(value: number): string {
    return value > 99 ? '99+' : String(value);
  }

  toggleFavorite(link: NavLink, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const current = this.favorites();
    if (current.includes(link.path)) {
      this.favorites.set(current.filter((path) => path !== link.path));
    } else if (current.length < 5) {
      this.favorites.set([...current, link.path]);
    } else {
      this.notify.warn('Puedes fijar hasta 5 pantallas favoritas.');
      return;
    }
    this.saveMenuPreferences();
  }

  goToFirstResult(): void {
    if (!this.navQuery.trim()) return;
    const link = this.menu.flatMap((section) => section.links)[0];
    if (!link) return;
    void this.router.navigateByUrl(link.path);
    this.onNavigate();
  }

  onNavigate(): void {
    this.closeMenu();
    this.userMenuOpen.set(false);
    this.navQuery = '';
  }

  focusNavigationSearch(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      this.menuOpen = true;
    } else {
      this.sidebarCollapsed.set(false);
      this.saveMenuPreferences();
    }
    setTimeout(() => {
      if (typeof document === 'undefined') return;
      const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('.admin-nav-search input'));
      inputs.find((input) => input.getClientRects().length > 0)?.focus();
    });
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  openProfile(): void {
    this.userMenuOpen.set(false);
    this.closeMenu();
    this.profileOpen.set(true);
  }

  roleLabel(): string {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      veterinarian: 'Veterinario',
      cashier: 'Caja',
      seller: 'Ventas',
    };
    return this.user?.roles?.map((role) => labels[role] ?? role).join(', ') || 'Usuario del panel';
  }

  @HostListener('document:keydown', ['$event'])
  handleShortcuts(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.focusNavigationSearch();
    }
    if (event.key === 'Escape') {
      this.userMenuOpen.set(false);
      if (this.navQuery) this.navQuery = '';
    }
  }

  @HostListener('document:click', ['$event'])
  closeUserMenuOnOutsideClick(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof Element && !target.closest('.admin-user-area')) {
      this.userMenuOpen.set(false);
    }
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  openPassword(): void {
    this.closeMenu();
    this.passwordError.set(null);
    this.passwordForm = { current: '', next: '', confirm: '' };
    this.passwordOpen.set(true);
  }

  savePassword(): void {
    if (this.passwordForm.next.length < 8) {
      this.passwordError.set('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.passwordForm.next !== this.passwordForm.confirm) {
      this.passwordError.set('Las contraseñas no coinciden.');
      return;
    }
    this.savingPassword.set(true);
    this.authService.changePassword(this.passwordForm.current, this.passwordForm.next, this.passwordForm.confirm).subscribe({
      next: (response) => {
        this.savingPassword.set(false);
        this.passwordOpen.set(false);
        this.notify.success(response.message);
      },
      error: (error: HttpErrorResponse) => {
        this.savingPassword.set(false);
        this.passwordError.set(apiMessage(error, 'No se pudo cambiar la contraseña.'));
      },
    });
  }

  logout(): void {
    this.userMenuOpen.set(false);
    this.closeMenu();
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['']),
      error: () => this.router.navigate(['']),
    });
  }

  private loadNavigationCounts(): void {
    if (this.authService.can('inventory.view')) {
      forkJoin({ lowStock: this.inventory.lowStock(), expiring: this.inventory.expiring() }).subscribe({
        next: ({ lowStock, expiring }) => this.alertCount.set(
          lowStock.length + expiring.vencido.length + expiring.vence_30.length,
        ),
        error: () => this.alertCount.set(0),
      });
    }
    if (this.authService.can('purchases.view')) {
      this.purchases.payables({ page: 1, perPage: 1 }).subscribe({
        next: (page) => this.payableCount.set(page.meta.total),
        error: () => this.payableCount.set(0),
      });
    }
    if (this.authService.can('clinic.view')) {
      this.clinic.appointments({ page: 1, perPage: 1, extra: { status: 'pendiente' } }).subscribe({
        next: (page) => this.appointmentCount.set(page.meta.total),
        error: () => this.appointmentCount.set(0),
      });
    }
  }

  private restoreMenuPreferences(): void {
    const defaults = ['/admin/dashboard', '/admin/pos', '/admin/caja', '/admin/productos', '/admin/stock'];
    const allowedPaths = new Set(this.menu.flatMap((section) => section.links.map((link) => link.path)));
    const defaultFavorites = defaults.filter((path) => allowedPaths.has(path)).slice(0, 5);
    if (typeof localStorage === 'undefined') {
      this.favorites.set(defaultFavorites);
      return;
    }
    try {
      const raw = localStorage.getItem(this.preferencesKey());
      if (!raw) {
        this.favorites.set(defaultFavorites);
        return;
      }
      const saved = JSON.parse(raw) as { collapsed?: boolean; favorites?: unknown; sections?: unknown };
      this.sidebarCollapsed.set(saved.collapsed === true);
      const savedFavorites = Array.isArray(saved.favorites) ? saved.favorites : [];
      this.favorites.set(savedFavorites.filter((path): path is string => typeof path === 'string' && allowedPaths.has(path)).slice(0, 5));
      this.collapsedSections.set(saved.sections && typeof saved.sections === 'object' ? saved.sections as Record<string, boolean> : {});
    } catch {
      this.favorites.set(defaultFavorites);
    }
  }

  private saveMenuPreferences(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.preferencesKey(), JSON.stringify({
        collapsed: this.sidebarCollapsed(),
        favorites: this.favorites(),
        sections: this.collapsedSections(),
      }));
    } catch {
      // Ignore storage errors; the menu state remains usable for this session.
    }
  }

  private preferencesKey(): string {
    return `alivet_admin_menu_${this.user?.id ?? 'default'}`;
  }

  private normalizeSearch(value: string): string {
    return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  }
}
