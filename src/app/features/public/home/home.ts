import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuienesSomos } from '../quienes-somos/quienes-somos';
import { Especialidades } from '../especialidades/especialidades';
import { Servicios } from '../servicios/servicios';
import { Galeria } from '../galeria/galeria';
import { SponsorsComponent } from '../sponsors/sponsors';
import { RedesSocialesComponent } from '../redes-sociales/redes-sociales';
interface SlideItem {
  image: string;
  title: string;
  subtitle: string;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, QuienesSomos, Especialidades, Servicios, Galeria, SponsorsComponent, RedesSocialesComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements OnInit, OnDestroy {
  currentSlide = signal(0);
  private sliderInterval: ReturnType<typeof setInterval> | null = null;

  slides: SlideItem[] = [
    {
      image: 'assets/img/mascota.jpg',
      title: 'Cuida tus Mascotas',
      subtitle: 'Atención integral para tus compañeros peludos',
    },
    {
      image: 'assets/img/vacunos.jpg',
      title: 'Cuida tus Vacunos',
      subtitle: 'Atención integral para tus animales de granja',
    },
    {
      image: 'assets/img/equinos.jpg',
      title: 'Cuida tus Equinos',
      subtitle: 'Atención integral para tus animales de granja',
    },
  ];

  ngOnInit(): void {
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
}
