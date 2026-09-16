import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {

  readonly currentYear = new Date().getFullYear();

  socials = [
    { nombre: 'Instagram', url: 'https://instagram.com' },
    { nombre: 'Facebook',  url: 'https://facebook.com' },
    { nombre: 'TikTok',    url: 'https://tiktok.com' },
    { nombre: 'YouTube',   url: 'https://youtube.com' },
    { nombre: 'WhatsApp',  url: 'https://wa.me/51987654321' },
  ];

  pagos = ['Yape', 'Plin', 'Transferencias'];

  links = [
    { label: 'Términos',   url: '#' },
    { label: 'Privacidad', url: '#' },
    { label: 'Soporte',    url: '#' },
  ];
}
