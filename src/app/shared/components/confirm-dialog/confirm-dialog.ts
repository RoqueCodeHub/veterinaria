import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [Dialog, Button],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [header]="title()"
      [visible]="open()"
      (visibleChange)="open.set($event)"
      [modal]="true"
      [style]="{ width: '28rem' }"
    >
      <p class="m-0">{{ message() }}</p>
      <div class="mt-4 flex justify-end gap-2">
        <p-button label="Cancelar" [outlined]="true" (onClick)="open.set(false)" />
        <p-button [label]="confirmLabel()" [severity]="severity()" [icon]="icon()" (onClick)="confirmed.emit()" />
      </div>
    </p-dialog>
  `,
})
export class ConfirmDialog {
  readonly open = model(false);
  readonly title = input('Confirmar');
  readonly message = input('');
  readonly confirmLabel = input('Confirmar');
  readonly severity = input<'danger' | 'secondary' | 'success' | 'warn'>('danger');
  readonly icon = input('pi pi-check');
  readonly confirmed = output<void>();
}
