import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../../core/theme/theme';

interface NavLink {
  label: string;
  path: string;
  exact?: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent {
  readonly theme = inject(ThemeService);
  readonly menuOpen = signal(false);

  navLinks: NavLink[] = [
    { label: 'Inicio', path: '/', exact: true },
    { label: 'Quienes Somos', path: '/quienes-somos' },
    { label: 'Especialidad', path: '/especialidades' },
    { label: 'Servicios', path: '/servicios' },
    { label: 'Galeria', path: '/galeria' },
    { label: 'Contacto', path: '/contacto' },
  ];

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
