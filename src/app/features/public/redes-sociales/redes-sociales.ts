import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from 'primeng/button';

export interface RedSocial {
  id: number;
  plataforma: string;
  handle: string;
  seguidores: string;
  descripcion: string;
  url: string;
  colorFrom: string;
  colorTo: string;
}

@Component({
  selector: 'app-redes-sociales',
  standalone: true,
  imports: [RouterLink, ButtonDirective],
  templateUrl: './redes-sociales.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RedesSocialesComponent {
  redes: RedSocial[] = [
    {
      id: 1,
      plataforma: 'Instagram',
      handle: '@AliVetOficial',
      seguidores: '45.2K',
      descripcion: 'Fotos del trabajo en campo, mascotas y animales de la zona.',
      url: 'https://instagram.com',
      colorFrom: '#833ab4',
      colorTo: '#fd1d1d',
    },
    {
      id: 2,
      plataforma: 'Facebook',
      handle: 'AliVetOficial',
      seguidores: '120K',
      descripcion: 'Comunidad de Alivet en Iberia. Avisos de atención y novedades de la clínica.',
      url: 'https://www.facebook.com/profile.php?id=61564744831448',
      colorFrom: '#1877f2',
      colorTo: '#0d5dbf',
    },
    {
      id: 3,
      plataforma: 'TikTok',
      handle: '@AliVetOficial',
      seguidores: '28.5K',
      descripcion: 'Videos cortos de atención en campo y cuidado de animales.',
      url: 'https://tiktok.com',
      colorFrom: '#010101',
      colorTo: '#69c9d0',
    },
    {
      id: 4,
      plataforma: 'YouTube',
      handle: 'AliVetOficial',
      seguidores: '12.8K',
      descripcion: 'Registros de atención veterinaria y cuidado animal en Tahuamanu.',
      url: 'https://youtube.com',
      colorFrom: '#ff0000',
      colorTo: '#cc0000',
    },
  ];
}
