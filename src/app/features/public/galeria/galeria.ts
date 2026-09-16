import { Component } from '@angular/core';

export interface GaleriaItem {
  src: string;
  alt: string;
  label: string;
  tall?: boolean;
}

@Component({
  selector: 'app-galeria',
  imports: [],
  templateUrl: './galeria.html',
  styleUrl: './galeria.css',
})
export class Galeria {

  fotos: GaleriaItem[] = [
    {
      src: 'assets/img/img1.png',
      alt: 'Trabajo en campo – Alivet',
      label: 'Trabajo en Campo',
      tall: true,
    },
    {
      src: 'assets/img/img2.jpg',
      alt: 'Atención animal – Alivet',
      label: 'Atención Animal',
    },
    {
      src: 'assets/img/img3.jpg',
      alt: 'Vacunación – Alivet',
      label: 'Vacunación',
    },
    {
      src: 'assets/img/img4.jpg',
      alt: 'Asesoría ganadera – Alivet',
      label: 'Asesoría Ganadera',
    },
    {
      src: 'assets/img/img5.jpg',
      alt: 'Ganadería en la selva – Alivet',
      label: 'Ganadería en la Selva',
      tall: true,
    },
    {
      src: 'assets/img/mascota.jpg',
      alt: 'Mascotas – Alivet',
      label: 'Mascotas',
    },
    {
      src: 'assets/img/img6.webp',
      alt: 'Equinos – Alivet',
      label: 'Equinos',
    },
  ];
}
