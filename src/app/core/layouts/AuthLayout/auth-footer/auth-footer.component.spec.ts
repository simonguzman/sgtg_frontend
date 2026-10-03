import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AuthFooterComponent } from './auth-footer.component';
import { APP_VERSION, getCurrentYear } from '../../../utils/app-metadata-utils';

describe('AuthFooterComponent', () => {
  let component: AuthFooterComponent;
  let fixture: ComponentFixture<AuthFooterComponent>;

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [AuthFooterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería inicializar el año y la versión leyendo las utilidades compartidas', () => {
      expect(component['currentYear']).toBe(getCurrentYear());
      expect(component['version']).toBe(APP_VERSION);
    });
  });

  describe('Renderizado del DOM', () => {
    it('debería renderizar la primera columna con la información de la Universidad', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const col1 = compiled.querySelector('.grid > div:nth-child(1)');
      expect(col1?.textContent).toContain('Universidad del Cauca');
      expect(col1?.textContent).toContain('NIT. 891500319-2');
    });

    it('debería renderizar la segunda columna con la información del Sistema', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const col2 = compiled.querySelector('.grid > div:nth-child(2)');
      expect(col2?.textContent).toContain('Sistema de gestión de trabajos de grado');
      expect(col2?.textContent).toContain('ejemplocorreo@unicauca.edu.co');
    });

    it('debería renderizar la tercera columna interpolando la versión y el año correctamente', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const col3 = compiled.querySelector('.grid > div:nth-child(3)');
      const expectedVersion = APP_VERSION;
      const expectedYear = getCurrentYear().toString();
      expect(col3?.textContent).toContain('División de Tecnologías de la Información y las Comunicaciones');
      expect(col3?.textContent).toContain(`Versión ${expectedVersion}`);
      expect(col3?.textContent).toContain(expectedYear);
    });

    it('debería renderizar la franja de colores superior (5 bloques)', () => {
      const colorBars = fixture.debugElement.queryAll(By.css('.h-1\\.5 > div'));
      expect(colorBars).toHaveLength(5);
    });

    it('debería contener los enlaces de políticas y soporte técnico con atributos válidos', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const links = compiled.querySelectorAll('.flex-wrap a') as NodeListOf<HTMLAnchorElement>;
      expect(links).toHaveLength(3);
      expect(links[0].textContent?.trim()).toBe('Política de Protección de Datos Personales');
      expect(links[0].getAttribute('href')).toBe('#');
      expect(links[1].textContent?.trim()).toBe('Política de seguridad de la información');
      expect(links[1].getAttribute('href')).toBe('#');
      expect(links[2].textContent?.trim()).toBe('Comunícate con nuestro Soporte Técnico');
      expect(links[2].getAttribute('href')).toBe('#');
    });
  });
});
