import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Sponsor {
  id: number;
  nombre: string;
  sigla: string;
  color: string;
}

@Component({
  selector: 'app-sponsors',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sponsors.html',
  styleUrl: './sponsors.css',
})
export class SponsorsComponent {

  sponsors: Sponsor[] = [
    { id: 1,  nombre: 'TechCorp Solutions',  sigla: 'TC',  color: '#2A168C' },
    { id: 2,  nombre: 'InvestMax Perú',      sigla: 'IM',  color: '#1a5c63' },
    { id: 3,  nombre: 'BancaPro',            sigla: 'BP',  color: '#0d4a52' },
    { id: 4,  nombre: 'SeguroTotal',         sigla: 'ST',  color: '#3a8a94' },
    { id: 5,  nombre: 'AutoGroup SAC',       sigla: 'AG',  color: '#2A168C' },
    { id: 6,  nombre: 'VivaTravel',          sigla: 'VT',  color: '#1a4d55' },
    { id: 7,  nombre: 'MediaNova',           sigla: 'MN',  color: '#3a7d85' },
    { id: 8,  nombre: 'ProSalud',            sigla: 'PS',  color: '#4a9aa4' },
  ];
}
