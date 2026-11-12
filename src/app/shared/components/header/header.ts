import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, type IsActiveMatchOptions } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Menubar } from 'primeng/menubar';
import { ButtonDirective } from 'primeng/button';

const sectionActive: IsActiveMatchOptions = {
  paths: 'exact',
  queryParams: 'ignored',
  matrixParams: 'ignored',
  fragment: 'exact',
};

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, Menubar, ButtonDirective],
  templateUrl: './header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  readonly items: MenuItem[] = [
    { label: 'Servicios', routerLink: ['/'], fragment: 'servicios', routerLinkActiveOptions: sectionActive },
    { label: 'Animales', routerLink: ['/'], fragment: 'especies', routerLinkActiveOptions: sectionActive },
    { label: 'Nosotros', routerLink: ['/'], fragment: 'nosotros', routerLinkActiveOptions: sectionActive },
    { label: 'Galería', routerLink: ['/'], fragment: 'galeria', routerLinkActiveOptions: sectionActive },
    { label: 'Contacto', routerLink: ['/'], fragment: 'contacto', routerLinkActiveOptions: sectionActive },
  ];
}
