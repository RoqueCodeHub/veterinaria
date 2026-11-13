import { ChangeDetectionStrategy, Component, effect, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { Observable } from 'rxjs';

export interface RemoteOption {
  id: number;
  label: string;
}

@Component({
  selector: 'app-remote-select',
  standalone: true,
  imports: [FormsModule, Select],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-select
      [options]="options()"
      optionLabel="label"
      optionValue="id"
      [ngModel]="value()"
      (ngModelChange)="value.set($event ?? null)"
      [filter]="true"
      (onFilter)="filtrar($event)"
      [placeholder]="placeholder()"
      appendTo="body"
      [showClear]="true"
      [disabled]="disabled()"
      styleClass="w-full"
    />
  `,
})
export class RemoteSelect {
  readonly search = input.required<(term: string) => Observable<RemoteOption[]>>();
  readonly value = model<number | null>(null);
  readonly placeholder = input('Selecciona');
  readonly disabled = input(false);
  readonly options = signal<RemoteOption[]>([]);
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const buscar = this.search();
      this.consultar(buscar, '');
    });
  }

  filtrar(event: { filter?: string }): void {
    const buscar = this.search();
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.consultar(buscar, event.filter ?? ''), 250);
  }

  private consultar(buscar: (term: string) => Observable<RemoteOption[]>, term: string): void {
    buscar(term).subscribe({ next: (rows) => this.options.set(rows) });
  }
}
