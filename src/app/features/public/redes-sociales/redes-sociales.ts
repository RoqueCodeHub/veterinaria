import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  imports: [CommonModule],
  templateUrl: './redes-sociales.html',
  styleUrl: './redes-sociales.css',
})
export class RedesSocialesComponent {

  redes: RedSocial[] = [
    {
      id: 1,
      plataforma: 'Instagram',
      handle: '@AliVetOficial',
      seguidores: '45.2K',
      descripcion: 'Fotos de premios, ganadores y sorteos en vivo.',
      url: 'https://instagram.com',
      colorFrom: '#833ab4',
      colorTo:   '#fd1d1d',
    },
    {
      id: 2,
      plataforma: 'Facebook',
      handle: 'AliVetOficial',
      seguidores: '120K',
      descripcion: 'Comunidad oficial. Resultados y transmisiones en directo.',
      url: 'https://facebook.com',
      colorFrom: '#1877f2',
      colorTo:   '#0d5dbf',
    },
    {
      id: 3,
      plataforma: 'TikTok',
      handle: '@AliVetOficial',
      seguidores: '28.5K',
      descripcion: 'Videos cortos de sorteos y reacciones de ganadores.',
      url: 'https://tiktok.com',
      colorFrom: '#010101',
      colorTo:   '#69c9d0',
    },
    {
      id: 4,
      plataforma: 'YouTube',
      handle: 'AliVetOficial',
      seguidores: '12.8K',
      descripcion: 'Sorteos en vivo y grabaciones completas de cada evento.',
      url: 'https://youtube.com',
      colorFrom: '#ff0000',
      colorTo:   '#cc0000',
    },
    {
      id: 5,
      plataforma: 'WhatsApp',
      handle: '+51 987 654 321',
      seguidores: '5,200 miembros',
      descripcion: 'Grupo oficial para notificaciones y atención al cliente.',
      url: 'https://wa.me/51987654321',
      colorFrom: '#25d366',
      colorTo:   '#128c7e',
    },
    {
      id: 6,
      plataforma: 'Twitter / X',
      handle: '@AliVetOficial',
      seguidores: '9.4K',
      descripcion: 'Noticias en tiempo real y anuncios de nuevos sorteos.',
      url: 'https://x.com',
      colorFrom: '#14171a',
      colorTo:   '#657786',
    },
  ];
}
