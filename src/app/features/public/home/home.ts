import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ButtonDirective } from 'primeng/button';
import { Card } from 'primeng/card';
import { QuienesSomos } from '../quienes-somos/quienes-somos';
import { Especialidades } from '../especialidades/especialidades';
import { Servicios } from '../servicios/servicios';
import { Galeria } from '../galeria/galeria';
import { RedesSocialesComponent } from '../redes-sociales/redes-sociales';
import { RevealDirective } from '../../../shared/directives/reveal';

@Component({
  selector: 'app-home',
  imports: [ButtonDirective, Card, QuienesSomos, Especialidades, Servicios, Galeria, RedesSocialesComponent, RevealDirective],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  readonly beneficios = [
    { titulo: 'Mascotas y campo', texto: 'Perros, gatos, bovinos, cerdos y aves' },
    { titulo: 'Visitas a finca', texto: 'Vamos hasta donde están tus animales' },
    { titulo: 'Productos en stock', texto: 'Alimentos, vacunas y fármacos' },
    { titulo: 'Pago fácil', texto: 'Yape, Plin y transferencias' },
  ] as const;
}
