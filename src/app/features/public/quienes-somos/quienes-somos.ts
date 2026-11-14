import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Card } from 'primeng/card';
import { RevealDirective } from '../../../shared/directives/reveal';

@Component({
  selector: 'app-quienes-somos',
  imports: [Card, RevealDirective],
  templateUrl: './quienes-somos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuienesSomos {
  readonly band = input(false);
}
