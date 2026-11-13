import { Component, inject, OnInit, signal } from '@angular/core';
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
import { ADMIN_NAV, NavSection } from '../../core/auth/admin-nav';
import { AuthService, StaffUser } from '../../core/auth/auth';
import { apiMessage } from '../../core/api/api-message';
import { NotifyService } from '../../core/ui/notify';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive, Avatar, Button, Dialog, Drawer, InputText, Toast],
  templateUrl: './admin-layout.html',
})
export class AdminLayoutComponent implements OnInit {
  user: StaffUser | null = null;
  menuOpen = false;
  passwordOpen = signal(false);
  savingPassword = signal(false);
  passwordError = signal<string | null>(null);
  passwordForm = { current: '', next: '', confirm: '' };
  private authService = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotifyService);

  get menu(): NavSection[] {
    return ADMIN_NAV
      .map((section) => ({
        ...section,
        links: section.links.filter((link) => this.authService.can(...link.permissions)),
      }))
      .filter((section) => section.links.length > 0);
  }

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.authService.refreshProfile().subscribe({
      next: (user) => {
        this.user = user;
      },
    });
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  openPassword(): void {
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
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['']),
      error: () => this.router.navigate(['']),
    });
  }
}
