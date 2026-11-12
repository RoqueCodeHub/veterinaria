import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { GalleriaModule } from 'primeng/galleria';
import { webpSrc } from '../../../shared/utils/webp-src';

export interface GaleriaItem {
  src: string;
  alt: string;
  label: string;
  tall?: boolean;
}

@Component({
  selector: 'app-galeria',
  imports: [GalleriaModule],
  templateUrl: './galeria.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Galeria {
  readonly preview = input(false);
  readonly toWebp = webpSrc;
  readonly responsive = [
    { breakpoint: '1024px', numVisible: 4 },
    { breakpoint: '768px', numVisible: 3 },
    { breakpoint: '560px', numVisible: 1 },
  ];

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

  get fotosInicio(): GaleriaItem[] {
    return this.fotos.slice(0, 4);
  }
}
