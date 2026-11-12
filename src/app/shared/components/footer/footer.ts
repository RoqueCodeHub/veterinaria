import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  readonly currentYear = new Date().getFullYear();

  readonly links = [
    { label: 'Términos', url: '#' },
    { label: 'Privacidad', url: '#' },
    { label: 'Soporte', url: '#' },
  ];
}
