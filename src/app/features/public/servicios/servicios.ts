import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { webpSrc } from '../../../shared/utils/webp-src';

export interface ServicioItem {
  titulo: string;
  texto: string;
  resumen?: string;
  accion?: string;
  imagen: string;
  alt: string;
  tipo: 'prod' | 'serv';
  etiqueta: string;
  tags: string[];
}

@Component({
  selector: 'app-servicios',
  imports: [RouterLink, Card, Tag],
  templateUrl: './servicios.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Servicios {
  readonly featured = input(false);
  readonly toWebp = webpSrc;
  readonly servicios: ServicioItem[] = [
    {
      titulo: 'Alimentos especializados',
      resumen: 'Alimentos balanceados para ganado, aves, porcinos, equinos y mascotas.',
      accion: 'Consultar disponibilidad',
      texto:
        'Proveemos alimentos balanceados y especializados para todo tipo de animales: ganado, aves de corral, porcinos, equinos y mascotas. Productos de marcas reconocidas con garantía de calidad.',
      imagen: 'assets/img/alimentos.png',
      alt: 'Alimentos balanceados para ganado, aves y mascotas',
      tipo: 'prod',
      etiqueta: 'Producto',
      tags: ['Ganado', 'Aves', 'Mascotas'],
    },
    {
      titulo: 'Vacunación y prevención',
      resumen: 'Aplicación profesional con carnet de vacunación para bovinos, ovinos, porcinos, equinos y mascotas.',
      accion: 'Agendar vacunación',
      texto:
        'Vacunas para la prevención de enfermedades en bovinos, ovinos, porcinos, equinos y mascotas. Administración profesional con trazabilidad y carnet de vacunación.',
      imagen: 'assets/img/vacunas.webp',
      alt: 'Veterinario aplicando una vacuna a un bovino',
      tipo: 'prod',
      etiqueta: 'Producto',
      tags: ['Bovinos', 'Ovinos', 'Mascotas'],
    },
    {
      titulo: 'Antibióticos y fármacos',
      resumen: 'Antibióticos, antiparasitarios y vitaminas, con asesoría de dosis según especie y peso.',
      accion: 'Pedir asesoría',
      texto:
        'Amplio stock de antibióticos, antiparasitarios, vitaminas y medicamentos veterinarios. Asesoría especializada en dosificación y tratamientos según el tipo y peso del animal.',
      imagen: 'assets/img/antebioticos.jpg',
      alt: 'Estante con antibióticos y medicamentos veterinarios',
      tipo: 'prod',
      etiqueta: 'Producto',
      tags: ['Antibióticos', 'Antiparasitarios', 'Vitaminas'],
    },
    {
      titulo: 'Trabajo en campo',
      texto:
        'Nos desplazamos hasta tu finca o chacra para brindar atención directa a tus animales. Visitas programadas o de emergencia con equipamiento completo para diagnóstico y tratamiento.',
      imagen: 'assets/img/campo.webp',
      alt: 'Veterinario atendiendo animales en una finca de Madre de Dios',
      tipo: 'serv',
      etiqueta: 'Servicio',
      tags: ['Visitas a finca', 'Emergencias', 'Diagnóstico'],
    },
    {
      titulo: 'Asesoría a ganaderos',
      texto:
        'Consultoría técnica integral para productores ganaderos: manejo sanitario, nutrición animal, reproducción, control de enfermedades y optimización de la producción en la selva peruana.',
      imagen: 'assets/img/asesoria.jpg',
      alt: 'Veterinario asesorando a un ganadero junto a su ganado',
      tipo: 'serv',
      etiqueta: 'Servicio',
      tags: ['Sanidad', 'Nutrición', 'Producción'],
    },
    {
      titulo: 'Atención de mascotas',
      texto:
        'Cuidamos a tus perros, gatos y otras mascotas con cariño y profesionalismo. Vacunación, desparasitación, consultas generales y venta de alimentos y accesorios para tu compañero fiel.',
      imagen: 'assets/img/atenciondemascotas.jpg',
      alt: 'Perro siendo atendido en consulta veterinaria',
      tipo: 'serv',
      etiqueta: 'Servicio',
      tags: ['Perros', 'Gatos', 'Otras mascotas'],
    },
  ];

  readonly visibles = computed(() => (this.featured() ? this.servicios.slice(0, 3) : this.servicios));

  whatsapp(item: ServicioItem): string {
    const texto = `Hola, Alivet. Quiero información sobre ${item.titulo}.`;
    return `https://wa.me/51932898744?text=${encodeURIComponent(texto)}`;
  }

  ocultarImagen(event: Event): void {
    (event.target as HTMLImageElement).remove();
  }
}
