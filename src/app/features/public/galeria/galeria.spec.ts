import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Galeria } from './galeria';

describe('Galeria', () => {
  let component: Galeria;
  let fixture: ComponentFixture<Galeria>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Galeria]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Galeria);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('opens the selected photo in the lightbox', () => {
    component.abrirImagen(3);

    expect(component.activeIndex()).toBe(3);
    expect(component.lightboxVisible()).toBe(true);
  });

  it('closes the lightbox when visibility changes', () => {
    component.abrirImagen(1);
    component.cambiarVisibilidad(false);

    expect(component.lightboxVisible()).toBe(false);
  });
});
