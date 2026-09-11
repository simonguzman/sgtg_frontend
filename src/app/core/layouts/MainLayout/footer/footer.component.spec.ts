import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';
import { APP_VERSION, getCurrentYear } from '../../../utils/app-metadata-utils';

describe('FooterComponent', () => {
  let component: FooterComponent;
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    // 🔕 Silenciar consola como medida preventiva y estándar en todos los tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [FooterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería tener el año actual y la versión configurada leyendo desde utils', () => {
      // Acceso mediante notación de corchetes para propiedades protected
      expect(component['currentYear']).toBe(getCurrentYear());
      expect(component['version']).toBe(APP_VERSION);
    });
  });

  describe('Renderizado del DOM', () => {
    it('debería mostrar el año actual en la primera sección del footer', () => {
      const compiled = fixture.nativeElement;
      const expectedYear = getCurrentYear();

      // Inferencia nativa del DOM, sin casteos
      const footerText = compiled.querySelector('.footer-inner > div:first-child')?.textContent;

      expect(footerText).toContain(expectedYear.toString());
      expect(footerText).toContain('Sistema de gestión de trabajos de grado');
    });

    it('debería mostrar la versión correcta en la segunda sección del footer', () => {
      const compiled = fixture.nativeElement;
      const footerText = compiled.querySelector('.footer-inner > div:last-child')?.textContent;

      expect(footerText).toContain(`Versión ${APP_VERSION}`);
      expect(footerText).toContain('División de Tecnologías de la Información y las Comunicaciones');
    });

    it('debería contener un enlace válido para soporte técnico', () => {
      const compiled = fixture.nativeElement;
      // Eliminamos el cast 'as HTMLAnchorElement' aprovechando el encadenamiento opcional
      const supportLink = compiled.querySelector('.footer-link');

      expect(supportLink).toBeTruthy();
      expect(supportLink?.textContent?.trim()).toBe('Soporte técnico');
      expect(supportLink?.getAttribute('href')).toBe('#');
    });
  });
});
