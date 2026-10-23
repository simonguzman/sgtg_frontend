import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InlineNoticeComponent } from './inline-notice.component';

@Component({
  standalone: true,
  imports: [InlineNoticeComponent],
  template: `
    <app-inline-notice id="porDefecto">Necesita un <strong>codirector</strong>.</app-inline-notice>
    <app-inline-notice id="conIcono" icon="warning">Atención</app-inline-notice>
  `
})
class HostComponent {}

describe('InlineNoticeComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  const icono = (id: string) =>
    fixture.nativeElement.querySelector(`#${id} .material-symbols-outlined`).textContent.trim();

  it('muestra el contenido proyectado', () => {
    const aviso = fixture.nativeElement.querySelector('#porDefecto p');
    expect(aviso.textContent).toContain('Necesita un codirector.');
    expect(aviso.querySelector('strong')).toBeTruthy();
  });

  it('usa el ícono de información por defecto o el indicado', () => {
    expect(icono('porDefecto')).toBe('info');
    expect(icono('conIcono')).toBe('warning');
  });
});
