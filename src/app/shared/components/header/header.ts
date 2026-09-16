// src/app/shared/components/header/header.component.ts
import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavLink {
  label: string;
  path: string;
  exact?: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class HeaderComponent {
  // Input opcional (por si más adelante quieres mostrar diferente si está logueado)
  isLoggedIn = input<boolean>(false);

  // Array de enlaces – aquí defines TODO el menú público
  navLinks: NavLink[] = [
    { label: 'Inicio', path: '/', exact: true },
    { label: 'Quienes Somos', path: '/quienes-somos' },
    { label: 'Especialidad', path: '/especialidad' },
    { label: 'Servicios', path: '/servicios' },
    { label: 'Galeria', path: '/galeria' },
    { label: 'Contacto', path: '/contacto' },
    // Puedes agregar más fácilmente después:
    // { label: 'Nosotros', path: '/nosotros' },
  ];
}