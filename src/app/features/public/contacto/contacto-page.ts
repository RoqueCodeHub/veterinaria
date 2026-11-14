import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Textarea } from 'primeng/textarea';
import { RevealDirective } from '../../../shared/directives/reveal';

interface ContactForm {
  nombre: string;
  correo: string;
  celular: string;
  asunto: string;
  mensaje: string;
}

@Component({
  selector: 'app-contacto-page',
  standalone: true,
  imports: [RouterLink, FormsModule, Button, Card, InputText, Message, Textarea, RevealDirective],
  templateUrl: './contacto-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactoPage {
  private http = inject(HttpClient);

  isSubmitting = signal(false);
  successMsg = signal('');
  errorMsg = signal('');

  form: ContactForm = {
    nombre: '',
    correo: '',
    celular: '',
    asunto: '',
    mensaje: '',
  };

  onSubmit() {
    this.errorMsg.set('');
    this.successMsg.set('');
    this.isSubmitting.set(true);

    this.http.post<any>(`${environment.apiUrl}/contactos`, this.form).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMsg.set('¡Mensaje enviado! Nos comunicaremos contigo a la brevedad.');
        this.form = { nombre: '', correo: '', celular: '', asunto: '', mensaje: '' };
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.message ?? 'Ocurrió un error al enviar. Intenta nuevamente.';
        this.errorMsg.set(msg);
      }
    });
  }
}
