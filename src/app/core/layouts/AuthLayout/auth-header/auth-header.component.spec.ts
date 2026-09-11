import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthHeaderComponent } from './auth-header.component';

describe('AuthHeaderComponent', () => {
  let component: AuthHeaderComponent;
  let fixture: ComponentFixture<AuthHeaderComponent>;

  beforeEach(async () => {
    // 🔕 Silenciar consola como medida preventiva y estándar en todos los tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      // Al no tener dependencias ni módulos, el setup es instantáneo
      imports: [AuthHeaderComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Ejecutamos el renderizado del HTML estático
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Renderizado del DOM estático', () => {
    it('debería renderizar el logo de Unicauca con el src y alt correctos', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      // Eliminamos el 'as HTMLImageElement' usando la inferencia base de Element
      const imgElement = compiled.querySelector('img');

      expect(imgElement).toBeTruthy(); // Verifica que la etiqueta <img> existe
      expect(imgElement?.getAttribute('src')).toBe('assets/images/logo-unicauca-azul.png');
      expect(imgElement?.getAttribute('alt')).toBe('Logo Unicauca');
    });

    it('debería renderizar el separador visual (línea vertical)', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      // Seleccionamos el div vacío que actúa como separador estilizado
      // Eliminamos el 'as HTMLElement'
      const separator = compiled.querySelector('.flex > div');

      expect(separator).toBeTruthy();
      expect(separator?.className).toContain('bg-[#143296]');
      expect(separator?.className).toContain('mx-2');
    });

    it('debería renderizar el título H1 con el texto correcto', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      // Eliminamos el 'as HTMLHeadingElement'
      const h1Element = compiled.querySelector('h1');

      expect(h1Element).toBeTruthy(); // Verifica que el H1 existe
      // Usamos textContent, encadenamiento opcional y trim() para limpieza segura
      expect(h1Element?.textContent?.trim()).toBe('Sistema de gestión de trabajo de grado');
    });
  });
});
