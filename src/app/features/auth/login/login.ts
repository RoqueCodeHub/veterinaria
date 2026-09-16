import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth';

interface SlideItem {
  image: string;
  title: string;
  subtitle: string;
}

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit, OnDestroy {
  loginForm: FormGroup;
  showPassword = signal(false);
  isLoading = signal(false);
  currentSlide = signal(0);
  errorMessage = signal<string | null>(null);
  private sliderInterval: ReturnType<typeof setInterval> | null = null;

  slides: SlideItem[] = [
    {
      image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80',
      title: 'Gestión Inteligente',
      subtitle: 'Administra tus recursos de forma eficiente y moderna',
    },
    {
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
      title: 'Análisis en Tiempo Real',
      subtitle: 'Visualiza tus datos con paneles interactivos y reportes avanzados',
    },
    {
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
      title: 'Colaboración Total',
      subtitle: 'Conecta a tu equipo en una sola plataforma integrada',
    },
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      remember: [false],
    });
  }

  ngOnInit(): void {
    // Limpiar sesión corrupta y redirigir si ya hay token válido
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.authService.clearSession(); // elimina cualquier token inválido previo
    }
    this.startSlider();
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
    this.stopSlider();
    this.startSlider();
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    this.authService.login({ email, password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/admin/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 401 || err.status === 422) {
          this.errorMessage.set('Credenciales incorrectas. Verifica tu correo y contraseña.');
        } else if (err.status === 0) {
          this.errorMessage.set('No se puede conectar al servidor. Verifica que el backend esté activo.');
        } else {
          this.errorMessage.set('Ocurrió un error inesperado. Intenta de nuevo.');
        }
        console.error('Error de login:', err);
      }
    });
  }

  get emailControl() {
    return this.loginForm.get('email');
  }

  get passwordControl() {
    return this.loginForm.get('password');
  }
}
