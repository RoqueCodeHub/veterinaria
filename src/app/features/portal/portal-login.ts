import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { apiMessage } from '../../core/api/api-message';
import { PortalAuthService } from '../../core/auth/portal-auth';

@Component({
  selector: 'app-portal-login',
  standalone: true,
  imports: [ReactiveFormsModule, Button, InputText],
  templateUrl: './portal-login.html',
})
export class PortalLogin {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(PortalAuthService);
  private readonly router = inject(Router);
  readonly error = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (user) => {
        if (!user.permissions.includes('portal.access')) {
          this.auth.clear();
          this.error.set('Esta cuenta no tiene acceso al portal.');
          return;
        }
        void this.router.navigateByUrl('/portal');
      },
      error: (error: HttpErrorResponse) => this.error.set(apiMessage(error, 'No se pudo entrar al portal.')),
    });
  }
}
