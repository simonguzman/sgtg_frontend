import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
// 1. Importamos la metadata extraída
import { APP_VERSION, getCurrentYear } from '../../../utils/app-metadata-utils';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Inicialización', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería tener el año actual y la versión configurada leyendo desde utils', () => {
      // 2. Comparamos contra la utilidad importada, no contra valores quemados
      expect(component['currentYear']).toBe(getCurrentYear());
      expect(component['version']).toBe(APP_VERSION);
    });
  });

  describe('Renderizado del DOM', () => {
    it('debería mostrar el año actual en la primera sección del footer', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      // 3. Usamos la utilidad para la aserción en el DOM
      const expectedYear = getCurrentYear();

      const footerText = compiled.querySelector('.footer-inner > div:first-child')?.textContent;

      expect(footerText).toContain(expectedYear.toString());
      expect(footerText).toContain('Sistema de gestión de trabajos de grado');
    });

    it('debería mostrar la versión correcta en la segunda sección del footer', () => {
      const compiled = fixture.nativeElement as HTMLElement;

      const footerText = compiled.querySelector('.footer-inner > div:last-child')?.textContent;

      // 4. Usamos APP_VERSION importada
      expect(footerText).toContain(`Versión ${APP_VERSION}`);
      expect(footerText).toContain('División de Tecnologías de la Información y las Comunicaciones');
    });

    it('debería contener un enlace válido para soporte técnico', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const supportLink = compiled.querySelector('.footer-link') as HTMLAnchorElement;

      expect(supportLink).toBeTruthy();
      expect(supportLink.textContent?.trim()).toBe('Soporte técnico');
      expect(supportLink.getAttribute('href')).toBe('#');
    });
  });
});
