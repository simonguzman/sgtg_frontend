import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { InfoBannerComponent } from './info-banner.component';

@Component({
  standalone: true,
  imports: [InfoBannerComponent],
  template: `
    <app-info-banner [title]="testTitle" [icon]="testIcon">
      <span class="projected-content">Este es un mensaje proyectado de prueba</span>
    </app-info-banner>
  `
})
class TestHostComponent {
  testTitle = 'Título desde Host';
  testIcon = 'warning';
}

describe('InfoBannerComponent', () => {

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Pruebas Aisladas (Signal Inputs)', () => {
    let component: InfoBannerComponent;
    let fixture: ComponentFixture<InfoBannerComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [InfoBannerComponent]
      }).compileComponents();

      fixture = TestBed.createComponent(InfoBannerComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('title', 'Título Inicial');
      fixture.detectChanges();
    });

    it('debería instanciar el componente correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería mostrar el título proporcionado a través del signal', () => {
      fixture.componentRef.setInput('title', 'Atención Requerida');
      fixture.detectChanges();
      const titleElement = fixture.debugElement.query(By.css('h3'));
      expect(titleElement).toBeTruthy();
      expect(titleElement.nativeElement.textContent.trim()).toBe('Atención Requerida');
    });

    it('debería mostrar el ícono por defecto ("info")', () => {
      const iconElement = fixture.debugElement.query(By.css('.material-symbols-outlined'));
      expect(iconElement).toBeTruthy();
      expect(iconElement.nativeElement.textContent.trim()).toBe('info');
    });

    it('debería mostrar un ícono personalizado cuando se provee a través del signal', () => {
      fixture.componentRef.setInput('icon', 'error');
      fixture.detectChanges();

      const iconElement = fixture.debugElement.query(By.css('.material-symbols-outlined'));
      expect(iconElement).toBeTruthy();
      expect(iconElement.nativeElement.textContent.trim()).toBe('error');
    });
  });

  describe('Pruebas de Integración (ng-content)', () => {
    let hostFixture: ComponentFixture<TestHostComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [TestHostComponent]
      }).compileComponents();

      hostFixture = TestBed.createComponent(TestHostComponent);
      hostFixture.detectChanges();
    });

    it('debería renderizar el contenido proyectado dentro de app-info-banner', () => {
      const projectedElement = hostFixture.debugElement.query(By.css('.projected-content'));
      expect(projectedElement).toBeTruthy();
      expect(projectedElement.nativeElement.textContent.trim()).toBe('Este es un mensaje proyectado de prueba');

      const bannerParagraphContainer = hostFixture.debugElement.query(By.css('.bg-blue-50 p'));
      expect(bannerParagraphContainer.nativeElement.contains(projectedElement.nativeElement)).toBeTruthy();
    });
  });
});
