import { Component, OnInit, OnDestroy, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface CountdownValue {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

@Component({
  selector: 'app-countdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './countdown.html',
  styleUrl: './countdown.css',
})
export class CountdownComponent implements OnInit, OnDestroy {

  // Configurable desde el padre — por defecto 7 días desde ahora
  @Input() targetDate: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Datos del sorteo (serán dinámicos cuando conectes la API)
  @Input() ticketsMeta     = 5000;
  @Input() ticketsVendidos = 1240;

  countdown = signal<CountdownValue>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  get ticketsPorcentaje(): number {
    return Math.min(100, Math.round((this.ticketsVendidos / this.ticketsMeta) * 100));
  }

  get ticketsFaltantes(): number {
    return this.ticketsMeta - this.ticketsVendidos;
  }

  ngOnInit(): void {
    this.updateCountdown();
    this.countdownInterval = setInterval(() => this.updateCountdown(), 1000);
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private updateCountdown(): void {
    const diff = Math.max(0, this.targetDate.getTime() - Date.now());
    this.countdown.set({
      days:    Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours:   Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    });
  }

  pad(n: number): string {
    return n.toString().padStart(2, '0');
  }
}
