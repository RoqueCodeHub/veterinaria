import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Button } from 'primeng/button';
import { PortalAuthService } from '../../core/auth/portal-auth';

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Button],
  templateUrl: './portal-layout.html',
})
export class PortalLayoutComponent {
  private readonly auth = inject(PortalAuthService);
  private readonly router = inject(Router);

  get user() {
    return this.auth.getUser();
  }

  logout(): void {
    this.auth.logout().subscribe(() => void this.router.navigateByUrl('/portal/login'));
  }
}
