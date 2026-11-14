import { ChangeDetectionStrategy, Component, afterNextRender, computed, input, signal } from '@angular/core';
import { GalleriaModule } from 'primeng/galleria';
import { webpSrc } from '../../../shared/utils/webp-src';
import { RevealDirective } from '../../../shared/directives/reveal';

export interface GaleriaItem {
  src: string;
  alt: string;
  label: string;
  tall?: boolean;
}

@Component({
  selector: 'app-galeria',
  imports: [GalleriaModule, RevealDirective],
  templateUrl: './galeria.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Galeria {
  readonly preview = input(false);
  readonly toWebp = webpSrc;
  readonly activeIndex = signal(0);
  readonly previewActiveIndex = signal(0);
  readonly lightboxVisible = signal(false);
  private readonly motionAllowed = signal(true);
  readonly autoPlay = computed(() => this.motionAllowed() && !this.lightboxVisible());

  constructor() {
    afterNextRender(() => {
      this.motionAllowed.set(!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    });
  }

  abrirImagen(index: number): void {
    this.activeIndex.set(this.limitarIndice(index, this.fotos.length));
    this.lightboxVisible.set(true);
  }

  actualizarImagen(index: number): void {
    this.activeIndex.set(this.limitarIndice(index, this.fotos.length));
  }

  actualizarImagenInicio(index: number): void {
    this.previewActiveIndex.set(this.limitarIndice(index, this.fotosInicio.length));
  }

  private limitarIndice(index: number, total: number): number {
    if (!Number.isFinite(index) || total < 1) return 0;
    return Math.min(Math.max(Math.trunc(index), 0), total - 1);
  }

  cambiarVisibilidad(visible: boolean): void {
    this.lightboxVisible.set(visible);
  }

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
      src: 'assets/img/asesoria.jpg',
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
