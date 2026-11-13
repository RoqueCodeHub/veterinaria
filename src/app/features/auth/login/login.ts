import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { firstAllowedPath } from '../../../core/auth/admin-nav';
import { AuthService } from '../../../core/auth/auth';

type LoginView = 'login' | 'forgot' | 'reset';

interface SlideItem {
  image: string;
  alt: string;
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, Button, Checkbox, InputText, Message],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly year = new Date().getFullYear();
  readonly mode = signal<LoginView>('login');
  readonly isLoading = signal(false);
  readonly showPassword = signal(false);
  readonly showResetPassword = signal(false);
  readonly currentSlide = signal(0);
  readonly errorMessage = signal<string | null>(null);
  readonly noticeMessage = signal<string | null>(null);
  private readonly resetToken = signal('');
  private sliderInterval: ReturnType<typeof setInterval> | null = null;

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [false],
  });

  readonly forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly resetForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmation: ['', [Validators.required]],
  });

  readonly slides: SlideItem[] = [
    {
      image: 'assets/img/nosotros.webp',
      alt: 'Veterinaria de Alivet con un perro y un gato en consulta',
    },
    {
      image: 'assets/img/mascota.webp',
      alt: 'Atención de mascotas en Veterinaria Alivet',
    },
    {
      image: 'assets/img/campo.webp',
      alt: 'Atención veterinaria en campo, Madre de Dios',
    },
  ];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const params = this.route.snapshot.queryParamMap;
    if (params.get('sesion') === 'vencida') {
      this.noticeMessage.set('Tu sesión ya no es válida. Vuelve a entrar.');
    }
    const token = params.get('token');
    const emailFromLink = params.get('email');
    const recovering = this.router.url.startsWith('/recuperar-contrasena');

    if (recovering && token && emailFromLink) {
      this.mode.set('reset');
      this.resetToken.set(token);
      this.resetForm.patchValue({ email: emailFromLink });
    } else if (recovering) {
      this.mode.set('forgot');
      const remembered = this.authService.rememberedEmail();
      if (remembered) {
        this.forgotForm.patchValue({ email: remembered });
      }
    } else if (this.authService.isLoggedIn()) {
      this.router.navigate(['/admin/dashboard']);
      return;
    } else {
      this.authService.clearSession();
      const remembered = this.authService.rememberedEmail();
      if (remembered) {
        this.loginForm.patchValue({ email: remembered, remember: true });
      }
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      this.startSlider();
    }
  }

  ngOnDestroy(): void {
    this.stopSlider();
  }

  startSlider(): void {
    this.sliderInterval = setInterval(() => {
      this.currentSlide.update(v => (v + 1) % this.slides.length);
    }, 4000);
  }

  stopSlider(): void {
    if (this.sliderInterval) {
      clearInterval(this.sliderInterval);
      this.sliderInterval = null;
    }
  }

  goToSlide(index: number): void {
    this.currentSlide.set(index);
    if (!this.sliderInterval) {
      return;
    }
    this.stopSlider();
    this.startSlider();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const email = this.loginForm.controls.email.value;
    const password = this.loginForm.controls.password.value;
    if (!email || !password) {
      this.isLoading.set(false);
      return;
    }

    this.authService.login({
      email,
      password,
      remember: this.loginForm.controls.remember.value === true,
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        const destino = firstAllowedPath((...permissions) => this.authService.can(...permissions)) ?? '/admin/dashboard';
        void this.router.navigateByUrl(destino);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        if (err.status === 401 || err.status === 422) {
          this.errorMessage.set('Credenciales incorrectas. Verifica tu correo y contraseña.');
          return;
        }
        this.errorMessage.set(this.readError(err, 'Ocurrió un error inesperado. Intenta de nuevo.'));
      }
    });
  }

  openForgot(): void {
    this.errorMessage.set(null);
    this.noticeMessage.set(null);
    const email = this.loginForm.controls.email.value;
    if (email) {
      this.forgotForm.patchValue({ email });
    }
    this.mode.set('forgot');
    void this.router.navigate(['/recuperar-contrasena']);
  }

  backToLogin(): void {
    this.errorMessage.set(null);
    this.noticeMessage.set(null);
    this.mode.set('login');
    void this.router.navigate(['/login']);
  }

  sendResetLink(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }
    const email = this.forgotForm.controls.email.value;
    if (!email) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.noticeMessage.set(null);
    this.authService.requestPasswordReset(email).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.noticeMessage.set(response.message);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.readError(err, 'No se pudo enviar el enlace. Intenta de nuevo.'));
      },
    });
  }

  saveNewPassword(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }
    const email = this.resetForm.controls.email.value;
    const password = this.resetForm.controls.password.value;
    const confirmation = this.resetForm.controls.confirmation.value;
    if (!email || !password || !confirmation) {
      return;
    }
    if (password !== confirmation) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.noticeMessage.set(null);
    this.authService.resetPassword({
      email,
      token: this.resetToken(),
      password,
      password_confirmation: confirmation,
    }).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.noticeMessage.set(response.message);
        this.resetForm.reset({ email, password: '', confirmation: '' });
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.readError(err, 'No se pudo actualizar la contraseña.'));
      },
    });
  }

  private readError(err: HttpErrorResponse, fallback: string): string {
    if (err.status === 0) {
      return 'No se puede conectar al servidor. Verifica que el backend esté activo.';
    }
    const message = err.error && typeof err.error === 'object' && 'message' in err.error
      ? err.error.message
      : null;
    return typeof message === 'string' && message.trim() ? message : fallback;
  }

  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }
}
