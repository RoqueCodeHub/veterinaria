import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Card } from 'primeng/card';

@Component({
  selector: 'app-quienes-somos',
  imports: [Card],
  templateUrl: './quienes-somos.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuienesSomos {
  readonly band = input(false);
}
