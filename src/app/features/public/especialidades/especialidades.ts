import { Component } from '@angular/core';

/**
 * Una especialidad (especie animal) que atiende la veterinaria.
 * Para agregar o editar tarjetas, solo cambia el arreglo ESPECIALIDADES:
 * el HTML se genera solo.
 */
interface Especialidad {
  id: string;
  nombre: string;
  /** Ruta de la foto (recomendado: 800×1000 px, vertical, .jpg o .webp) */
  imagen: string;
  alt: string;
  descripcion: string;
  servicios: string[];
  /** Resalta la tarjeta con borde de acento y la etiqueta "Más solicitado" */
  destacado?: boolean;
}

const ESPECIALIDADES: readonly Especialidad[] = [
  {
    id: 'bovinos',
    nombre: 'Bovinos',
    imagen: 'assets/img/bovino.jpg',
    alt: 'Ganado bovino pastando en una finca de Madre de Dios',
    descripcion:
      'Vacunación, desparasitación, atención de partos, tratamientos y asesoría integral para el manejo sanitario de tu hato ganadero.',
    servicios: [
      'Vacunación antiaftosa y clostridial',
      'Control de garrapatas y parásitos',
      'Atención de partos difíciles',
      'Suplementación vitamínica',
    ],
  },
  {
    id: 'porcinos',
    nombre: 'Porcinos',
    imagen: 'assets/img/porcino.png',
    alt: 'Cerdos en una granja porcina',
    descripcion:
      'Manejo sanitario completo para granjas porcinas: planes de vacunación, control de enfermedades respiratorias y digestivas, y optimización productiva.',
    servicios: [
      'Vacunación contra PPC y Micoplasma',
      'Tratamiento de enfermedades digestivas',
      'Manejo de camadas y reproductores',
      'Planes sanitarios personalizados',
    ],
  },
  {
    id: 'aves',
    nombre: 'Aves de corral',
    imagen: 'assets/img/aves.webp',
    alt: 'Gallinas y pollos en un corral',
    descripcion:
      'Asistencia técnica para granjas avícolas y crianza familiar: vacunación, bioseguridad y control de enfermedades respiratorias e intestinales.',
    servicios: [
      'Vacunación Newcastle y Gumboro',
      'Control de Marek y Bronquitis',
      'Planes de bioseguridad',
      'Alimentos balanceados para aves',
    ],
  },
  {
    id: 'ovinos-caprinos',
    nombre: 'Ovinos y caprinos',
    imagen: 'assets/img/CABRA_OVEJA.jpg',
    alt: 'Ovejas y cabras en un potrero',
    descripcion:
      'Atención especializada para ovinos y caprinos: control parasitario, vacunación y manejo reproductivo para maximizar la productividad de tu rebaño.',
    servicios: [
      'Desparasitación estratégica',
      'Vacunación enterotoxemia',
      'Manejo reproductivo',
      'Nutrición y suplementación',
    ],
  },
  {
    id: 'equinos',
    nombre: 'Equinos',
    imagen: 'assets/img/equinos.jpg',
    alt: 'Caballo de trabajo en el campo',
    descripcion:
      'Cuidado integral para caballos y mulas de trabajo en campo: vacunación, desparasitación, herrado y atención de enfermedades propias de la selva.',
    servicios: [
      'Vacunación contra Tétano y EEV',
      'Desparasitación interna y externa',
      'Atención de cólicos y heridas',
      'Cuidado de cascos',
    ],
  },
  {
    id: 'mascotas',
    nombre: 'Mascotas',
    imagen: 'assets/img/mascotas.jpg',
    alt: 'Perro y gato atendidos en consulta veterinaria',
    descripcion:
      'Perros, gatos y otras mascotas merecen lo mejor. Ofrecemos atención completa para tus compañeros más fieles: vacunas, consultas y más.',
    servicios: [
      'Vacunación antirrábica y polivalente',
      'Desparasitación interna y externa',
      'Consultas y diagnóstico general',
      'Venta de alimentos y accesorios',
    ],
    destacado: true,
  },
];

@Component({
  selector: 'app-especialidades',
  imports: [],
  templateUrl: './especialidades.html',
  styleUrl: './especialidades.css',
})
export class Especialidades {
  readonly especialidades = ESPECIALIDADES;

  /** Si la foto aún no existe, se oculta y queda el fondo de color de la tarjeta. */
  ocultarImagen(evento: Event): void {
    (evento.target as HTMLImageElement).style.display = 'none';
  }
}